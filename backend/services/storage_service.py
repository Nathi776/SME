import os
import uuid
import boto3
from botocore.exceptions import NoCredentialsError
from fastapi import UploadFile
from config import get_settings

settings = get_settings()

# For S3 uploads
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Fallback persistent local directory (in the project root instead of /tmp)
PERSISTENT_UPLOAD_DIR = os.environ.get("PERSISTENT_UPLOAD_DIR", "uploads")
os.makedirs(PERSISTENT_UPLOAD_DIR, exist_ok=True)


def save_uploaded_file(file: UploadFile) -> tuple[bytes, str]:
    """
    Saves an uploaded file.
    If AWS S3 environment variables are provided, uploads to S3 bucket.
    Otherwise, saves to a persistent local 'uploads' directory.
    Returns (file_bytes, file_url).
    """
    raw_bytes = file.file.read()
    # Reset pointer just in case
    file.file.seek(0)
    
    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    unique_filename = f"{uuid.uuid4().hex}{ext}"

    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME:
        try:
            s3 = boto3.client(
                "s3",
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION
            )
            s3.put_object(
                Bucket=AWS_STORAGE_BUCKET_NAME,
                Key=unique_filename,
                Body=raw_bytes,
                ContentType=file.content_type or "application/octet-stream"
            )
            # Standard public URL
            file_url = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
            return raw_bytes, file_url
        except NoCredentialsError:
            pass # fall back to local if credentials failed
        except Exception as e:
            print(f"S3 upload error: {e}")
            # fall back to local if upload failed

    # Fallback to persistent local storage (relative path)
    saved_path = os.path.join(PERSISTENT_UPLOAD_DIR, unique_filename)
    with open(saved_path, "wb") as f:
        f.write(raw_bytes)
    
    # Return path as absolute or normalized to avoid any slash issues
    return raw_bytes, os.path.abspath(saved_path)
