"""Add bank statement columns to smes table

Revision ID: 009_add_bank_statement_columns
Revises: 008_nullable_invoice_pre_invoice
Create Date: 2026-06-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "009_add_bank_statement_columns"
down_revision = "008_nullable_invoice_pre_invoice"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("smes", sa.Column("bs_avg_monthly_balance", sa.Numeric(18, 2), nullable=True))
    op.add_column("smes", sa.Column("bs_avg_monthly_income", sa.Numeric(18, 2), nullable=True))
    op.add_column("smes", sa.Column("bs_avg_monthly_expenses", sa.Numeric(18, 2), nullable=True))
    op.add_column("smes", sa.Column("bs_overdraft_count", sa.Integer(), nullable=True))
    op.add_column("smes", sa.Column("bs_income_regularity", sa.Numeric(18, 4), nullable=True))
    op.add_column("smes", sa.Column("bs_months_analysed", sa.Integer(), nullable=True))
    op.add_column("smes", sa.Column("bs_parsed_revenue", sa.Numeric(18, 2), nullable=True))

def downgrade() -> None:
    op.drop_column("smes", "bs_parsed_revenue")
    op.drop_column("smes", "bs_months_analysed")
    op.drop_column("smes", "bs_income_regularity")
    op.drop_column("smes", "bs_overdraft_count")
    op.drop_column("smes", "bs_avg_monthly_expenses")
    op.drop_column("smes", "bs_avg_monthly_income")
    op.drop_column("smes", "bs_avg_monthly_balance")
