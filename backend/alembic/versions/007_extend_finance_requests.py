"""Extend finance requests

Revision ID: 007_extend_finance_requests
Revises: 006_extend_invoice_fields
Create Date: 2026-06-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "007_extend_finance_requests"
down_revision = "006_extend_invoice_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("finance_requests", sa.Column("purpose_of_funding", sa.String(), nullable=True))
    op.add_column("finance_requests", sa.Column("preferred_payout_date", sa.DateTime(), nullable=True))
    op.add_column("finance_requests", sa.Column("additional_notes", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("finance_requests", "additional_notes")
    op.drop_column("finance_requests", "preferred_payout_date")
    op.drop_column("finance_requests", "purpose_of_funding")
