"""Add CIPC fields to smes table

Revision ID: 012_add_cipc_fields
Revises: 011_add_loi_counterparty
Create Date: 2026-06-24

Adds to smes:
  cipc_registration_number  — extracted from CIPC certificate on upload
  cipc_verified_at          — timestamp when CIPC was auto-verified via API
  cipc_company_name         — company name as returned by CIPC API
  cipc_status               — "In Business" | "Deregistered" | etc.
"""
from alembic import op
import sqlalchemy as sa

revision      = "012_add_cipc_fields"
down_revision = "011_add_loi_counterparty"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    with op.batch_alter_table("smes") as batch_op:
        batch_op.add_column(sa.Column("cipc_registration_number", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("cipc_verified_at",         sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("cipc_company_name",        sa.String(), nullable=True))
        batch_op.add_column(sa.Column("cipc_status",              sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("smes") as batch_op:
        batch_op.drop_column("cipc_status")
        batch_op.drop_column("cipc_company_name")
        batch_op.drop_column("cipc_verified_at")
        batch_op.drop_column("cipc_registration_number")
