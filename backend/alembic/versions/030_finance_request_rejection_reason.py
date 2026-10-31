"""store why a lender rejected a finance request

Revision ID: 030_finance_request_rejection_reason
Revises: 029_finance_request_messages
Create Date: 2026-10-31
"""

from alembic import op
import sqlalchemy as sa

revision = "030_finance_request_rejection_reason"
down_revision = "029_finance_request_messages"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("finance_requests", sa.Column("rejection_reason", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("finance_requests", "rejection_reason")
