"""lenders need admin approval before they can see any business data

Revision ID: 032_lender_approval
Revises: 031_verification_reviewer_identity
Create Date: 2026-11-14
"""

from alembic import op
import sqlalchemy as sa

revision = "032_lender_approval"
down_revision = "031_verification_reviewer_identity"
branch_labels = None
depends_on = None


def upgrade():
    # New lenders default to "pending". Lenders that already exist are set to "approved" so that this
    # change does not lock out accounts that are in use. REVIEW EXISTING LENDER ACCOUNTS after deploying:
    # an admin can suspend any of them with PUT /admin/lenders/{id}/suspend.
    op.add_column("lenders", sa.Column("approval_status", sa.String(), nullable=False, server_default="pending"))
    op.add_column("lenders", sa.Column("approved_at", sa.DateTime(), nullable=True))
    op.add_column("lenders", sa.Column("approved_by_user_id", sa.Integer(), nullable=True))
    op.execute("UPDATE lenders SET approval_status = 'approved'")
    with op.batch_alter_table("lenders") as batch:
        batch.create_foreign_key("fk_lenders_approved_by_user", "users", ["approved_by_user_id"], ["id"])


def downgrade():
    with op.batch_alter_table("lenders") as batch:
        batch.drop_constraint("fk_lenders_approved_by_user", type_="foreignkey")
        batch.drop_column("approved_by_user_id")
        batch.drop_column("approved_at")
        batch.drop_column("approval_status")
