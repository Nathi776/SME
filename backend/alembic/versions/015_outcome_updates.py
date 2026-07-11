"""Add outcome_status and check-in due date columns

Revision ID: 015_outcome_updates
Revises: 014_add_sme_outcomes
Create Date: 2026-07-11

"""
from alembic import op
import sqlalchemy as sa

revision      = "015_outcome_updates"
down_revision = "014_add_sme_outcomes"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column(
        "sme_outcomes",
        sa.Column(
            "outcome_status",
            sa.String(length=50),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "sme_outcomes",
        sa.Column("check_in_90_due_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "sme_outcomes",
        sa.Column("check_in_180_due_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "sme_outcomes",
        sa.Column("check_in_365_due_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sme_outcomes", "check_in_365_due_at")
    op.drop_column("sme_outcomes", "check_in_180_due_at")
    op.drop_column("sme_outcomes", "check_in_90_due_at")
    op.drop_column("sme_outcomes", "outcome_status")
