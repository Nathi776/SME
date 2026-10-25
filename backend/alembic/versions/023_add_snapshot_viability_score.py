"""add viability_score to assessment snapshots

Revision ID: 023_add_snapshot_viability_score
Revises: 022_add_observation_bank_statement_provenance
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa

revision = "023_add_snapshot_viability_score"
down_revision = "022_add_observation_bank_statement_provenance"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "assessment_snapshots",
        sa.Column("viability_score", sa.Float(), nullable=True),
    )


def downgrade():
    op.drop_column("assessment_snapshots", "viability_score")
