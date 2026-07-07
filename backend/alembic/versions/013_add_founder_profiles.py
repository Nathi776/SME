"""Create founder_profiles table

Revision ID: 013_add_founder_profiles
Revises: 012_add_cipc_fields
Create Date: 2026-06-24

Creates the founder_profiles table linked one-to-one with smes.
This table holds Layer 1 founder signals for the scoring engine.
"""
from alembic import op
import sqlalchemy as sa

revision      = "013_add_founder_profiles"
down_revision = "012_add_cipc_fields"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "founder_profiles",
        sa.Column("id",     sa.Integer(), primary_key=True),
        sa.Column("sme_id", sa.Integer(),
                  sa.ForeignKey("smes.id", ondelete="CASCADE"),
                  nullable=False, unique=True),

        # Identity
        sa.Column("id_number", sa.String(), nullable=True),

        # Employment & experience
        sa.Column("prior_employer",            sa.String(),  nullable=True),
        sa.Column("prior_job_title",           sa.String(),  nullable=True),
        sa.Column("prior_industry",            sa.String(),  nullable=True),
        sa.Column("years_industry_experience", sa.Integer(), nullable=True),
        sa.Column("prior_business_owner",      sa.Boolean(), nullable=True),
        sa.Column("prior_business_name",       sa.String(),  nullable=True),

        # Education
        sa.Column("highest_qualification", sa.String(), nullable=True),
        sa.Column("field_of_study",        sa.String(), nullable=True),

        # Network & references
        sa.Column("trade_association_member", sa.Boolean(), nullable=True),
        sa.Column("trade_association_name",   sa.String(),  nullable=True),
        sa.Column("reference_name",           sa.String(),  nullable=True),
        sa.Column("reference_company",        sa.String(),  nullable=True),
        sa.Column("reference_phone",          sa.String(),  nullable=True),

        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_founder_profiles_sme_id", "founder_profiles", ["sme_id"])


def downgrade() -> None:
    op.drop_index("ix_founder_profiles_sme_id", table_name="founder_profiles")
    op.drop_table("founder_profiles")
