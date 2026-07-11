"""Add sme_outcomes table

Revision ID: 014_add_sme_outcomes
Revises: 013_add_founder_profiles
Create Date: 2026-07-10

Creates the sme_outcomes table linked to finance_requests and smes.
"""
from alembic import op
import sqlalchemy as sa

revision      = "014_add_sme_outcomes"
down_revision = "013_add_founder_profiles"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "sme_outcomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "finance_request_id",
            sa.Integer(),
            sa.ForeignKey("finance_requests.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "sme_id",
            sa.Integer(),
            sa.ForeignKey("smes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("score_at_funding", sa.Float(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("outstanding_recommendations", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),

        sa.Column(
            "checkin_90_completed",
            sa.Boolean(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("checkin_90_date", sa.DateTime(), nullable=True),
        sa.Column("checkin_90_still_operating", sa.Boolean(), nullable=True),
        sa.Column(
            "checkin_90_revenue",
            sa.Numeric(precision=18, scale=2),
            nullable=True,
        ),
        sa.Column("checkin_90_loan_repaid", sa.Boolean(), nullable=True),

        sa.Column(
            "checkin_180_completed",
            sa.Boolean(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("checkin_180_date", sa.DateTime(), nullable=True),
        sa.Column("checkin_180_still_operating", sa.Boolean(), nullable=True),
        sa.Column(
            "checkin_180_revenue",
            sa.Numeric(precision=18, scale=2),
            nullable=True,
        ),
        sa.Column("checkin_180_loan_repaid", sa.Boolean(), nullable=True),

        sa.Column(
            "checkin_365_completed",
            sa.Boolean(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("checkin_365_date", sa.DateTime(), nullable=True),
        sa.Column("checkin_365_still_operating", sa.Boolean(), nullable=True),
        sa.Column(
            "checkin_365_revenue",
            sa.Numeric(precision=18, scale=2),
            nullable=True,
        ),
        sa.Column("checkin_365_loan_repaid", sa.Boolean(), nullable=True),
    )
    op.create_index(
        "ix_sme_outcomes_finance_request_id",
        "sme_outcomes",
        ["finance_request_id"],
    )
    op.create_index("ix_sme_outcomes_sme_id", "sme_outcomes", ["sme_id"])


def downgrade() -> None:
    op.drop_index("ix_sme_outcomes_sme_id", table_name="sme_outcomes")
    op.drop_index(
        "ix_sme_outcomes_finance_request_id", table_name="sme_outcomes"
    )
    op.drop_table("sme_outcomes")
