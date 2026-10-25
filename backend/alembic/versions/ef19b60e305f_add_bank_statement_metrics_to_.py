
"""add bank statement metrics to verifications

Revision ID: ef19b60e305f
Revises: eb2a48d747da
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ef19b60e305f"
down_revision: Union[str, Sequence[str], None] = "eb2a48d747da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "verifications",
        sa.Column("bs_avg_monthly_balance", sa.Numeric(18, 2), nullable=True),
    )
    op.add_column(
        "verifications",
        sa.Column("bs_avg_monthly_income", sa.Numeric(18, 2), nullable=True),
    )
    op.add_column(
        "verifications",
        sa.Column("bs_avg_monthly_expenses", sa.Numeric(18, 2), nullable=True),
    )
    op.add_column(
        "verifications",
        sa.Column("bs_overdraft_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "verifications",
        sa.Column("bs_income_regularity", sa.Numeric(18, 4), nullable=True),
    )
    op.add_column(
        "verifications",
        sa.Column("bs_months_analysed", sa.Integer(), nullable=True),
    )
    op.add_column(
        "verifications",
        sa.Column("bs_parsed_revenue", sa.Numeric(18, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("verifications", "bs_parsed_revenue")
    op.drop_column("verifications", "bs_months_analysed")
    op.drop_column("verifications", "bs_income_regularity")
    op.drop_column("verifications", "bs_overdraft_count")
    op.drop_column("verifications", "bs_avg_monthly_expenses")
    op.drop_column("verifications", "bs_avg_monthly_income")
    op.drop_column("verifications", "bs_avg_monthly_balance")
