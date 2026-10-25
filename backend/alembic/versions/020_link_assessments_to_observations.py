"""link assessment snapshots to business observations

Revision ID: 020_link_assessment_snapshots_to_observations
Revises: 019_add_business_observations
Create Date: 2026-10-02
"""

from alembic import op
import sqlalchemy as sa

revision = "020_link_assessment_snapshots_to_observations"
down_revision = "019_add_business_observations"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "assessment_snapshots",
        sa.Column(
            "business_observation_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_assessment_snapshots_business_observation_id",
        "assessment_snapshots",
        ["business_observation_id"],
    )

    op.create_foreign_key(
        "fk_assessment_snapshots_business_observation_id",
        "assessment_snapshots",
        "business_observations",
        ["business_observation_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint(
        "fk_assessment_snapshots_business_observation_id",
        "assessment_snapshots",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_assessment_snapshots_business_observation_id",
        table_name="assessment_snapshots",
    )

    op.drop_column(
        "assessment_snapshots",
        "business_observation_id",
    )
