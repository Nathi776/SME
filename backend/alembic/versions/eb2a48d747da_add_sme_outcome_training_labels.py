"""add SME outcome training labels

Revision ID: eb2a48d747da
Revises: 06c145e52032
Create Date: 2026-10-24 10:24:43.527263

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eb2a48d747da'
down_revision: Union[str, Sequence[str], None] = '06c145e52032'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sme_outcomes",
        sa.Column("y1_survived_12m", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sme_outcomes",
        sa.Column("y2_survived_18m", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sme_outcomes",
        sa.Column("y3_reached_100k", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sme_outcomes",
        sa.Column("y4_revenue_grew", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sme_outcomes",
        sa.Column("y5_defaulted", sa.Boolean(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sme_outcomes", "y5_defaulted")
    op.drop_column("sme_outcomes", "y4_revenue_grew")
    op.drop_column("sme_outcomes", "y3_reached_100k")
    op.drop_column("sme_outcomes", "y2_survived_18m")
    op.drop_column("sme_outcomes", "y1_survived_12m")
