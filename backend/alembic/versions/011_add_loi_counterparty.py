"""Add loi_counterparty_known to verifications table

Revision ID: 011_add_loi_counterparty
Revises: 010_add_location_fields
Create Date: 2026-06-24

Adds:
  verifications.loi_counterparty_known — Boolean, nullable
    True  → admin confirmed the LOI counterparty is a known/recognised entity
    False → counterparty unknown
    None  → not applicable or not yet reviewed
"""
from alembic import op
import sqlalchemy as sa

revision      = "011_add_loi_counterparty"
down_revision = "010_add_location_fields"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    with op.batch_alter_table("verifications") as batch_op:
        batch_op.add_column(
            sa.Column("loi_counterparty_known", sa.Boolean(), nullable=True, server_default=None)
        )


def downgrade() -> None:
    with op.batch_alter_table("verifications") as batch_op:
        batch_op.drop_column("loi_counterparty_known")
