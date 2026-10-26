"""append-only data consent records

Revision ID: 026_data_consents
Revises: 025_hash_legacy_plaintext_passwords
Create Date: 2026-10-26
"""

from alembic import op
import sqlalchemy as sa

revision = "026_data_consents"
down_revision = "025_hash_legacy_plaintext_passwords"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "data_consents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purpose", sa.String(50), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("policy_version", sa.String(20), nullable=False),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_data_consents_id", "data_consents", ["id"])
    op.create_index("ix_data_consents_user_id", "data_consents", ["user_id"])
    op.create_index("ix_data_consents_purpose", "data_consents", ["purpose"])


def downgrade():
    op.drop_table("data_consents")
