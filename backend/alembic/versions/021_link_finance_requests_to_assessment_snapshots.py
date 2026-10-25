"""link finance requests to assessment snapshots

Revision ID: 021_link_finance_requests_to_assessment_snapshots
Revises: 020_link_assessment_snapshots_to_observations
Create Date: 2026-10-06
"""

from alembic import op
import sqlalchemy as sa


revision = "021_link_finance_requests_to_assessment_snapshots"
down_revision = "020_link_assessment_snapshots_to_observations"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "finance_requests",
        sa.Column(
            "assessment_snapshot_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_finance_requests_assessment_snapshot_id",
        "finance_requests",
        ["assessment_snapshot_id"],
    )
    op.create_foreign_key(
        "fk_finance_requests_assessment_snapshot_id",
        "finance_requests",
        "assessment_snapshots",
        ["assessment_snapshot_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint(
        "fk_finance_requests_assessment_snapshot_id",
        "finance_requests",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_finance_requests_assessment_snapshot_id",
        table_name="finance_requests",
    )
    op.drop_column(
        "finance_requests",
        "assessment_snapshot_id",
    )
