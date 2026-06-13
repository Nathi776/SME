"""Extend invoice fields

Revision ID: 006_extend_invoice_fields
Revises: 005_add_verifications
Create Date: 2026-06-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "006_extend_invoice_fields"
down_revision = "005_add_verifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("invoice_number", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("issue_date", sa.DateTime(), nullable=True))
    op.add_column("invoices", sa.Column("due_date", sa.DateTime(), nullable=True))
    op.add_column("invoices", sa.Column("currency", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("customer_company", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("contact_person", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("email", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("phone", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("customer_industry", sa.String(), nullable=True))
    op.add_column("invoices", sa.Column("payment_terms", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "payment_terms")
    op.drop_column("invoices", "customer_industry")
    op.drop_column("invoices", "phone")
    op.drop_column("invoices", "email")
    op.drop_column("invoices", "contact_person")
    op.drop_column("invoices", "customer_company")
    op.drop_column("invoices", "currency")
    op.drop_column("invoices", "due_date")
    op.drop_column("invoices", "issue_date")
    op.drop_column("invoices", "invoice_number")
