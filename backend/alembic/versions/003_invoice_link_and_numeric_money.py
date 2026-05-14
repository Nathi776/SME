"""Add invoice linkage and convert monetary columns to numeric

Revision ID: 003_invoice_numeric_money
Revises: 002
Create Date: 2026-05-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "003_invoice_numeric_money"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "finance_requests",
        sa.Column("invoice_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_finance_requests_invoice_id_invoices",
        "finance_requests",
        "invoices",
        ["invoice_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.alter_column(
        "finance_requests",
        "amount_requested",
        type_=sa.Numeric(18, 2),
        existing_type=sa.Float(),
        postgresql_using="amount_requested::numeric",
    )
    op.alter_column(
        "finance_requests",
        "approved_amount",
        type_=sa.Numeric(18, 2),
        existing_type=sa.Float(),
        postgresql_using="approved_amount::numeric",
    )
    op.alter_column(
        "finance_requests",
        "fee_rate",
        type_=sa.Numeric(18, 4),
        existing_type=sa.Float(),
        postgresql_using="fee_rate::numeric",
    )
    op.alter_column(
        "finance_requests",
        "platform_fee",
        type_=sa.Numeric(18, 2),
        existing_type=sa.Float(),
        postgresql_using="platform_fee::numeric",
    )
    op.alter_column(
        "finance_requests",
        "net_amount",
        type_=sa.Numeric(18, 2),
        existing_type=sa.Float(),
        postgresql_using="net_amount::numeric",
    )
    op.alter_column(
        "invoices",
        "amount",
        type_=sa.Numeric(18, 2),
        existing_type=sa.Float(),
        postgresql_using="amount::numeric",
    )
    op.alter_column(
        "smes",
        "revenue",
        type_=sa.Numeric(18, 2),
        existing_type=sa.Float(),
        postgresql_using="revenue::numeric",
    )
    op.alter_column(
        "lenders",
        "max_lending_amount",
        type_=sa.Numeric(18, 2),
        existing_type=sa.Float(),
        postgresql_using="max_lending_amount::numeric",
    )


def downgrade() -> None:
    op.alter_column(
        "lenders",
        "max_lending_amount",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 2),
        postgresql_using="max_lending_amount::double precision",
    )
    op.alter_column(
        "smes",
        "revenue",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 2),
        postgresql_using="revenue::double precision",
    )
    op.alter_column(
        "invoices",
        "amount",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 2),
        postgresql_using="amount::double precision",
    )
    op.alter_column(
        "finance_requests",
        "net_amount",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 2),
        postgresql_using="net_amount::double precision",
    )
    op.alter_column(
        "finance_requests",
        "platform_fee",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 2),
        postgresql_using="platform_fee::double precision",
    )
    op.alter_column(
        "finance_requests",
        "fee_rate",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 4),
        postgresql_using="fee_rate::double precision",
    )
    op.alter_column(
        "finance_requests",
        "approved_amount",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 2),
        postgresql_using="approved_amount::double precision",
    )
    op.alter_column(
        "finance_requests",
        "amount_requested",
        type_=sa.Float(),
        existing_type=sa.Numeric(18, 2),
        postgresql_using="amount_requested::double precision",
    )
    op.drop_constraint(
        "fk_finance_requests_invoice_id_invoices",
        "finance_requests",
        type_="foreignkey",
    )
    op.drop_column("finance_requests", "invoice_id")