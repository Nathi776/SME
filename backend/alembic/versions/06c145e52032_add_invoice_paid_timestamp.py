"""add invoice paid timestamp

Revision ID: 06c145e52032
Revises: 021_link_finance_requests_to_assessment_snapshots
Create Date: 2026-10-24 09:59:28.531621

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '06c145e52032'
down_revision: Union[str, Sequence[str], None] = '021_link_finance_requests_to_assessment_snapshots'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_invoices_paid_at",
        "invoices",
        ["paid_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_invoices_paid_at", table_name="invoices")
    op.drop_column("invoices", "paid_at")
