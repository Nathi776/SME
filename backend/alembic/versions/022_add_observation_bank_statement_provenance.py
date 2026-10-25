"""record which verification a business observation's bank signals came from

Revision ID: 022_add_observation_bank_statement_provenance
Revises: 021_link_finance_requests_to_assessment_snapshots
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa

revision = "022_add_observation_bank_statement_provenance"
down_revision = "021_link_finance_requests_to_assessment_snapshots"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "business_observations",
        sa.Column("bank_statement_verification_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_business_observations_bank_statement_verification_id",
        "business_observations",
        ["bank_statement_verification_id"],
    )
    op.create_foreign_key(
        "fk_business_observations_bank_statement_verification_id",
        "business_observations",
        "verifications",
        ["bank_statement_verification_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint(
        "fk_business_observations_bank_statement_verification_id",
        "business_observations",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_business_observations_bank_statement_verification_id",
        table_name="business_observations",
    )
    op.drop_column("business_observations", "bank_statement_verification_id")
