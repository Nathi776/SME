"""hash any legacy plaintext passwords

verify_password no longer falls back to comparing plaintext, so rows that were
stored unhashed would be locked out. Hash them in place so those users can
still log in with their existing password.

Revision ID: 025_hash_legacy_plaintext_passwords
Revises: 024_email_verification_codes
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext

revision = "025_hash_legacy_plaintext_passwords"
down_revision = "024_email_verification_codes"
branch_labels = None
depends_on = None

_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade():
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, hashed_password FROM users")).fetchall()
    for user_id, stored in rows:
        if stored and not stored.startswith("$2"):  # not a bcrypt hash
            conn.execute(
                sa.text("UPDATE users SET hashed_password = :h WHERE id = :i"),
                {"h": _ctx.hash(stored[:72]), "i": user_id},
            )


def downgrade():
    pass  # hashing is one-way; nothing to undo
