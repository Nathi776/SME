"""database-backed email verification codes and users.email_verified_at

Revision ID: 024_email_verification_codes
Revises: 023_add_snapshot_viability_score
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa

revision = "024_email_verification_codes"
down_revision = "023_add_snapshot_viability_score"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(), nullable=True))
    op.create_table(
        "email_verification_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "channel", name="uq_verification_user_channel"),
    )
    op.create_index("ix_email_verification_codes_id", "email_verification_codes", ["id"])
    op.create_index("ix_email_verification_codes_user_id", "email_verification_codes", ["user_id"])


def downgrade():
    op.drop_table("email_verification_codes")
    op.drop_column("users", "email_verified_at")
