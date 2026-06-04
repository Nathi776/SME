"""Add invoice pdf_url column

Revision ID: 004_add_invoice_pdf_url
Revises: 003_invoice_numeric_money
Create Date: 2026-06-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "004_add_invoice_pdf_url"
down_revision = "003_invoice_numeric_money"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("pdf_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "pdf_url")