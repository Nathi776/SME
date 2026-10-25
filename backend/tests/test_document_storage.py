"""Private document storage: validation, no leaked references, authorised access."""
import io
from decimal import Decimal
from types import SimpleNamespace

import pytest

from models.lender import Lender
from models.sme import SME
from models.verification import Verification
from routers import verification_router
from services import storage_service
from services.storage_service import InvalidUpload, resolve_document, validate_upload

PDF = b"%PDF-1.4 minimal"


# ── Pure storage-service behaviour ───────────────────────────────────────────

def test_validate_accepts_matching_signatures():
    assert validate_upload("a.PDF", PDF) == ".pdf"
    assert validate_upload("a.png", b"\x89PNG\r\n\x1a\nxx") == ".png"
    assert validate_upload("a.jpeg", b"\xff\xd8\xffxx") == ".jpeg"


@pytest.mark.parametrize("name,data", [
    ("evil.html", b"<script>alert(1)</script>"),
    ("noext", PDF),
    ("a.exe", b"MZ"),
    ("a.pdf", b"<html>not a pdf</html>"),   # extension/content mismatch
    ("a.pdf", b""),
])
def test_validate_rejects_bad_uploads(name, data):
    with pytest.raises(InvalidUpload):
        validate_upload(name, data)


def test_local_save_returns_opaque_reference_not_a_path(api):
    f = SimpleNamespace(file=io.BytesIO(PDF), filename="s.pdf", content_type="application/pdf")
    _, ref = storage_service.save_uploaded_file(f)
    assert ref.startswith("local:") and "/" not in ref and "\\" not in ref
    assert resolve_document(ref).kind == "file"


def test_resolve_blocks_path_traversal_and_missing_files(api):
    for ref in ("local:../../etc/passwd", "local:..", "/etc/passwd",
                "..\\..\\windows\\system.ini", "local:nope.pdf", None, ""):
        assert resolve_document(ref) is None


def test_legacy_absolute_path_resolves_by_basename_inside_upload_dir(api):
    (api.upload_dir).mkdir(parents=True, exist_ok=True)
    (api.upload_dir / "abc123.pdf").write_bytes(PDF)
    access = resolve_document("/srv/old/location/uploads/abc123.pdf")
    assert access.kind == "file" and access.location.endswith("abc123.pdf")


def test_s3_reference_is_presigned_with_short_expiry(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "k")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "s")
    monkeypatch.setenv("AWS_STORAGE_BUCKET_NAME", "bkt")
    calls = {}

    class FakeS3:
        def generate_presigned_url(self, op, Params, ExpiresIn):
            calls.update(op=op, Params=Params, ExpiresIn=ExpiresIn)
            return "https://signed.example/x"

    monkeypatch.setattr(storage_service, "_s3_client", lambda: FakeS3())

    for ref in ("s3:key.pdf", "https://bkt.s3.us-east-1.amazonaws.com/key.pdf"):
        access = resolve_document(ref)
        assert access.kind == "redirect" and access.location == "https://signed.example/x"
        assert calls["Params"]["Key"] == "key.pdf"
        assert calls["Params"]["ResponseContentDisposition"] == "attachment"
        assert calls["ExpiresIn"] == storage_service.PRESIGNED_URL_TTL_SECONDS <= 300


def test_s3_upload_is_encrypted_and_not_public(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "k")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "s")
    monkeypatch.setenv("AWS_STORAGE_BUCKET_NAME", "bkt")
    put = {}

    class FakeS3:
        def put_object(self, **kw):
            put.update(kw)

    monkeypatch.setattr(storage_service, "_s3_client", lambda: FakeS3())
    f = SimpleNamespace(file=io.BytesIO(PDF), filename="s.pdf", content_type="application/pdf")
    _, ref = storage_service.save_uploaded_file(f)

    assert ref.startswith("s3:")
    assert put["ServerSideEncryption"] == "AES256"
    assert "ACL" not in put


# ── Endpoint behaviour ───────────────────────────────────────────────────────

def _make_sme(api, user):
    db = api.Session()
    sme = SME(user_id=user.id, name="Acme", revenue=Decimal("1000"), years_active=1,
              industry="Retail", province="Gauteng")
    db.add(sme)
    db.commit()
    db.close()


def _upload(api, headers, name="doc.pdf", data=PDF, doc_type="tax_clearance"):
    return api.client.post(
        "/verifications/submit", headers=headers, data={"doc_type": doc_type},
        files={"file": (name, io.BytesIO(data), "application/octet-stream")},
    )


def test_upload_response_and_listing_never_expose_storage_reference(api):
    sme_user = api.make_user("sme")
    _make_sme(api, sme_user)
    h = api.login(sme_user)

    r = _upload(api, h)
    assert r.status_code == 200, r.text
    vid = r.json()["id"]
    assert r.json()["document_url"] == f"/verifications/{vid}/document"

    listing = api.client.get("/verifications/my", headers=h).json()
    assert listing[0]["document_url"] == f"/verifications/{vid}/document"
    blob = r.text + str(listing)
    assert "local:" not in blob and str(api.upload_dir) not in blob


def test_upload_rejects_disallowed_type_and_mismatched_content(api):
    sme_user = api.make_user("sme")
    _make_sme(api, sme_user)
    h = api.login(sme_user)
    assert _upload(api, h, name="x.html", data=b"<script>").status_code == 400
    assert _upload(api, h, name="x.pdf", data=b"not a pdf").status_code == 400
    assert not api.upload_dir.exists() or not list(api.upload_dir.iterdir())


def test_owner_and_admin_can_download_others_cannot(api):
    owner, other, admin = api.make_user("sme"), api.make_user("sme"), api.make_user("admin")
    _make_sme(api, owner)
    _make_sme(api, other)
    vid = _upload(api, api.login(owner)).json()["id"]

    ok = api.client.get(f"/verifications/{vid}/document", headers=api.login(owner))
    assert ok.status_code == 200 and ok.content == PDF
    assert "attachment" in ok.headers["content-disposition"]
    assert api.client.get(f"/verifications/{vid}/document", headers=api.login(admin)).status_code == 200

    assert api.client.get(f"/verifications/{vid}/document", headers=api.login(other)).status_code == 404
    assert api.client.get(f"/verifications/{vid}/document").status_code == 401


def test_lender_downloads_only_their_own_documents(api):
    lender_user, other_lender_user = api.make_user("lender"), api.make_user("lender")
    db = api.Session()
    for u in (lender_user, other_lender_user):
        db.add(Lender(user_id=u.id, organization_name="Org", contact_email=u.email,
                      max_lending_amount=1000))
    db.commit()
    db.close()

    vid = _upload(api, api.login(lender_user), doc_type="registration_docs").json()["id"]
    assert api.client.get(f"/verifications/{vid}/document",
                          headers=api.login(lender_user)).status_code == 200
    assert api.client.get(f"/verifications/{vid}/document",
                          headers=api.login(other_lender_user)).status_code == 404


def test_legacy_public_url_row_is_still_served_after_presign(api, monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "k")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "s")
    monkeypatch.setenv("AWS_STORAGE_BUCKET_NAME", "bkt")

    class FakeS3:
        def generate_presigned_url(self, *a, **k):
            return "https://signed.example/legacy"

    monkeypatch.setattr(storage_service, "_s3_client", lambda: FakeS3())

    owner = api.make_user("sme")
    _make_sme(api, owner)
    db = api.Session()
    sme = db.query(SME).filter(SME.user_id == owner.id).one()
    v = Verification(doc_type="tax_clearance", status="pending", sme_id=sme.id,
                     document_url="https://bkt.s3.us-east-1.amazonaws.com/legacy.pdf")
    db.add(v)
    db.commit()
    vid = v.id
    db.close()

    r = api.client.get(f"/verifications/{vid}/document", headers=api.login(owner),
                       follow_redirects=False)
    assert r.status_code == 307 and r.headers["location"] == "https://signed.example/legacy"
    listing = api.client.get("/verifications/my", headers=api.login(owner)).json()
    assert "amazonaws" not in str(listing)
