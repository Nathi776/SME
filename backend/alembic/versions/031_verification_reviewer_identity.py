"""record who reviewed a verification and how

Revision ID: 031_verification_reviewer_identity
Revises: 030_finance_request_rejection_reason
Create Date: 2026-11-06
"""

from alembic import op
import sqlalchemy as sa

revision = "031_verification_reviewer_identity"
down_revision = "030_finance_request_rejection_reason"
branch_labels = None
depends_on = None


def upgrade():
    # Existing decisions stay NULL: the reviewer is genuinely unknown, and is not back-filled.
    op.add_column("verifications", sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True))
    op.add_column("verifications", sa.Column("review_method", sa.String(), nullable=True))
    with op.batch_alter_table("verifications") as batch:
        batch.create_foreign_key("fk_verifications_reviewed_by_user", "users", ["reviewed_by_user_id"], ["id"])


def downgrade():
    with op.batch_alter_table("verifications") as batch:
        batch.drop_constraint("fk_verifications_reviewed_by_user", type_="foreignkey")
        batch.drop_column("review_method")
        batch.drop_column("reviewed_by_user_id")
