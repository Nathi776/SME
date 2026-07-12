"""Add outcome_status and check-in due dates to sme_outcomes

Revision ID: 015_add_outcome_status_due_dates
Revises: 014_add_sme_outcomes
Create Date: 2026-07-11

Adds the three fields that were in the model but missing from migration 014:
  sme_outcomes.outcome_status        — "pending"|"active"|"repaid"|"defaulted"
  sme_outcomes.check_in_90_due_at   — funded_at + 90 days
  sme_outcomes.check_in_180_due_at  — funded_at + 180 days
  sme_outcomes.check_in_365_due_at  — funded_at + 365 days
"""
from alembic import op
import sqlalchemy as sa

revision      = "015_add_outcome_status_due_dates"
down_revision = "014_add_sme_outcomes"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    with op.batch_alter_table("sme_outcomes") as batch_op:
        batch_op.add_column(
            sa.Column(
                "outcome_status",
                sa.String(50),
                nullable=False,
                server_default="pending",
            )
        )
        batch_op.add_column(sa.Column("check_in_90_due_at",  sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("check_in_180_due_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("check_in_365_due_at", sa.DateTime(), nullable=True))

    # Index outcome_status for fast analytics queries
    op.create_index(
        "ix_sme_outcomes_outcome_status",
        "sme_outcomes",
        ["outcome_status"],
    )


def downgrade() -> None:
    op.drop_index("ix_sme_outcomes_outcome_status", table_name="sme_outcomes")
    with op.batch_alter_table("sme_outcomes") as batch_op:
        batch_op.drop_column("check_in_365_due_at")
        batch_op.drop_column("check_in_180_due_at")
        batch_op.drop_column("check_in_90_due_at")
        batch_op.drop_column("outcome_status")
