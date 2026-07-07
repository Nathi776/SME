"""Add province and business_city to smes table

Revision ID: 010_add_location_fields
Revises: 009_add_bank_statement_columns
Create Date: 2026-06-24

Adds:
  smes.province       — one of the 9 SA provinces (nullable, existing rows default NULL)
  smes.business_city  — free text city name (nullable)
"""
from alembic import op
import sqlalchemy as sa

revision     = "010_add_location_fields"
down_revision = "009_add_bank_statement_columns"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    with op.batch_alter_table("smes") as batch_op:
        batch_op.add_column(sa.Column("province",      sa.String(), nullable=True))
        batch_op.add_column(sa.Column("business_city", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("smes") as batch_op:
        batch_op.drop_column("business_city")
        batch_op.drop_column("province")
