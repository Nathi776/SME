"""add business observations

Revision ID: 019_add_business_observations
Revises: 018_add_assessment_snapshots
Create Date: 2026-10-01
"""

from alembic import op
import sqlalchemy as sa

revision = "019_add_business_observations"
down_revision = "018_add_assessment_snapshots"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "business_observations",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "sme_id",
            sa.Integer(),
            sa.ForeignKey(
                "smes.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "observed_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "source",
            sa.String(length=50),
            nullable=False,
            server_default="system",
        ),

        # Operating state
        sa.Column(
            "still_operating",
            sa.Boolean(),
            nullable=True,
        ),

        sa.Column(
            "years_active",
            sa.Integer(),
            nullable=True,
        ),

        # Financial state
        sa.Column(
            "revenue",
            sa.Numeric(18, 2),
            nullable=True,
        ),

        sa.Column(
            "avg_monthly_balance",
            sa.Numeric(18, 2),
            nullable=True,
        ),

        sa.Column(
            "avg_monthly_income",
            sa.Numeric(18, 2),
            nullable=True,
        ),

        sa.Column(
            "avg_monthly_expenses",
            sa.Numeric(18, 2),
            nullable=True,
        ),

        # Trading
        sa.Column(
            "total_invoices",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "paid_on_time",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "unpaid_invoices",
            sa.Integer(),
            nullable=True,
        ),

        # Bank statement
        sa.Column(
            "overdraft_count",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "income_regularity",
            sa.Numeric(18, 4),
            nullable=True,
        ),

        sa.Column(
            "months_analysed",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "parsed_revenue",
            sa.Numeric(18, 2),
            nullable=True,
        ),

        # Context
        sa.Column(
            "industry",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "province",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "business_city",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "additional_data",
            sa.JSON(),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_business_observations_sme_id",
        "business_observations",
        ["sme_id"],
    )

    op.create_index(
        "ix_business_observations_observed_at",
        "business_observations",
        ["observed_at"],
    )


def downgrade():
    op.drop_index(
        "ix_business_observations_observed_at",
        table_name="business_observations",
    )

    op.drop_index(
        "ix_business_observations_sme_id",
        table_name="business_observations",
    )

    op.drop_table("business_observations")
