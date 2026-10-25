"""
services/storage_service.py

Private document storage.

* Documents are never publicly readable. The database stores an opaque
  reference ("s3:<key>" or "local:<filename>"), never a public URL or a
  server filesystem path.
* Access goes through an authorised endpoint that either streams the local
  file or redirects to a short-lived presigned S3 URL.
* Uploads are checked for an allowed type and for matching file signature
  before anything is stored.

S3 bucket hygiene (outside this code): enable "Block all public access" on
the bucket. Objects are written with server-side encryption and no ACL.
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from dataclasses import dataclass
from urllib.parse import urlparse

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from fastapi import UploadFile

logger = logging.getLogger(__name__)

PRESIGNED_URL_TTL_SECONDS = 300

# extension -> file signature that the content must start with
ALLOWED_TYPES: dict[str, tuple[bytes, ...]] = {
    ".pdf": (b"%PDF-",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
}


class InvalidUpload(ValueError):
    """Raised when an upload has a disallowed type or mismatched content."""


def _upload_dir() -> str:
    path = os.environ.get("PERSISTENT_UPLOAD_DIR", "uploads")
    os.makedirs(path, exist_ok=True)
    return path


def _s3_settings() -> tuple[str | None, str | None, str | None, str]:
    return (
        os.environ.get("AWS_ACCESS_KEY_ID"),
        os.environ.get("AWS_SECRET_ACCESS_KEY"),
        os.environ.get("AWS_STORAGE_BUCKET_NAME"),
        os.environ.get("AWS_REGION", "us-east-1"),
    )


def _s3_client():
    key_id, secret, _, region = _s3_settings()
    return boto3.client(
        "s3",
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
        region_name=region,
    )


def _s3_enabled() -> bool:
    key_id, secret, bucket, _ = _s3_settings()
    return bool(key_id and secret and bucket)


def validate_upload(filename: str | None, data: bytes) -> str:
    """Return the normalised extension, or raise InvalidUpload."""
    ext = os.path.splitext(filename or "")[1].lower()
    signatures = ALLOWED_TYPES.get(ext)
    if signatures is None:
        allowed = ", ".join(sorted(ALLOWED_TYPES))
        raise InvalidUpload(f"Unsupported file type. Allowed: {allowed}")
    if not data:
        raise InvalidUpload("The uploaded file is empty.")
    if not any(data.startswith(sig) for sig in signatures):
        raise InvalidUpload("File content does not match its extension.")
    return ext


def save_uploaded_file(file: UploadFile) -> tuple[bytes, str]:
    """
    Store an upload privately. Returns (file_bytes, storage_reference).
    Raises InvalidUpload for disallowed or mismatched files.
    """
    raw_bytes = file.file.read()
    file.file.seek(0)
    ext = validate_upload(file.filename, raw_bytes)
    unique_name = f"{uuid.uuid4().hex}{ext}"

    if _s3_enabled():
        _, _, bucket, _ = _s3_settings()
        try:
            _s3_client().put_object(
                Bucket=bucket,
                Key=unique_name,
                Body=raw_bytes,
                ContentType=file.content_type or "application/octet-stream",
                ServerSideEncryption="AES256",
            )
            return raw_bytes, f"s3:{unique_name}"
        except (NoCredentialsError, BotoCoreError, ClientError):
            logger.exception("S3 upload failed; falling back to local storage")

    with open(os.path.join(_upload_dir(), unique_name), "wb") as fh:
        fh.write(raw_bytes)
    return raw_bytes, f"local:{unique_name}"


@dataclass(frozen=True)
class DocumentAccess:
    kind: str                 # "redirect" or "file"
    location: str             # presigned URL, or absolute path of a local file
    filename: str


_SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


def resolve_document(reference: str | None) -> DocumentAccess | None:
    """
    Turn a stored reference into a way to serve the document, or None if it
    cannot be served. Understands legacy values (public S3 URLs and absolute
    server paths) so documents uploaded before this change stay reachable.
    """
    if not reference:
        return None

    if reference.startswith("s3:"):
        return _presigned(reference[3:])

    if reference.startswith("local:"):
        return _local(reference[6:])

    parsed = urlparse(reference)
    if parsed.scheme in {"http", "https"} and "amazonaws.com" in (parsed.netloc or ""):
        return _presigned(parsed.path.lstrip("/"))

    # Legacy absolute/relative path: only the file name is trusted, and it is
    # always resolved inside the upload directory.
    return _local(os.path.basename(reference.replace("\\", "/")))


def _local(filename: str) -> DocumentAccess | None:
    if not filename or not _SAFE_NAME.match(filename):
        return None
    base = os.path.realpath(_upload_dir())
    path = os.path.realpath(os.path.join(base, filename))
    if os.path.commonpath([base, path]) != base or not os.path.isfile(path):
        return None
    return DocumentAccess("file", path, filename)


def _presigned(key: str) -> DocumentAccess | None:
    if not key or not _s3_enabled():
        return None
    _, _, bucket, _ = _s3_settings()
    try:
        url = _s3_client().generate_presigned_url(
            "get_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ResponseContentDisposition": "attachment",
            },
            ExpiresIn=PRESIGNED_URL_TTL_SECONDS,
        )
    except (BotoCoreError, ClientError):
        logger.exception("Could not presign document key")
        return None
    return DocumentAccess("redirect", url, os.path.basename(key))
