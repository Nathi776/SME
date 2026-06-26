"""Make invoice_id nullable and add request_type to finance_requests

Revision ID: 008_nullable_invoice_pre_invoice
Revises: 007_extend_finance_requests
Create Date: 2026-06-24 00:00:00.000000

What this migration does:
  1. Drops the NOT NULL constraint on finance_requests.invoice_id
  2. Changes the FK on_delete from RESTRICT to SET NULL
  3. Adds request_type column ("invoice_backed" | "pre_invoice")
     — defaults to "invoice_backed" so all existing rows stay valid
"""
from alembic import op
import sqlalchemy as sa


revision = "008_nullable_invoice_pre_invoice"
down_revision = "007_extend_finance_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add request_type with a default so existing rows are immediately valid
    op.add_column(
        "finance_requests",
        sa.Column(
            "request_type",
            sa.String(),
            nullable=False,
            server_default="invoice_backed",
        ),
    )

    # 2. Drop the old FK constraint (name may vary by DB engine; use batch_alter for SQLite compat)
    with op.batch_alter_table("finance_requests") as batch_op:
        # Drop old FK
        batch_op.drop_constraint("fk_finance_requests_invoice_id_invoices", type_="foreignkey")

        # Make invoice_id nullable
        batch_op.alter_column(
            "invoice_id",
            existing_type=sa.Integer(),
            nullable=True,
        )

        # Re-add FK with SET NULL so deleting an invoice nulls the reference
        batch_op.create_foreign_key(
            "fk_finance_requests_invoice_id_invoices",
            "invoices",
            ["invoice_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("finance_requests") as batch_op:
        batch_op.drop_constraint("fk_finance_requests_invoice_id_invoices", type_="foreignkey")
        batch_op.alter_column(
            "invoice_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.create_foreign_key(
            "fk_finance_requests_invoice_id_invoices",
            "invoices",
            ["invoice_id"],
            ["id"],
            ondelete="RESTRICT",
        )

    op.drop_column("finance_requests", "request_type")
