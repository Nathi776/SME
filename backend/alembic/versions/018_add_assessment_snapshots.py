"""add assessment snapshots

Revision ID: 018_add_assessment_snapshots
Revises: 017_add_api_key_prefix
Create Date: 2026-10-01
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "018_add_assessment_snapshots"
down_revision = "017_add_api_key_prefix"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "assessment_snapshots",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "sme_id",
            sa.Integer(),
            sa.ForeignKey("smes.id", ondelete="CASCADE"),
            nullable=False,
        ),

        sa.Column(
            "assessed_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "profile",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "strategy_version",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "inference_version",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "score",
            sa.Float(),
            nullable=False,
        ),

        sa.Column(
            "decision",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "evidence_depth",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "input_snapshot",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "factor_breakdown",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "market_context",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "recommendations",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_assessment_snapshots_sme_id",
        "assessment_snapshots",
        ["sme_id"],
    )

    op.create_index(
        "ix_assessment_snapshots_assessed_at",
        "assessment_snapshots",
        ["assessed_at"],
    )


def downgrade():
    op.drop_index(
        "ix_assessment_snapshots_assessed_at",
        table_name="assessment_snapshots",
    )

    op.drop_index(
        "ix_assessment_snapshots_sme_id",
        table_name="assessment_snapshots",
    )

    op.drop_table("assessment_snapshots")