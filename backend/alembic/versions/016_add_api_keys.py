"""Add api_keys table

Revision ID: 016_add_api_keys
Revises: 015_add_outcome_status_due_dates
Create Date: 2026-07-15
"""
from alembic import op
import sqlalchemy as sa

revision = "016_add_api_keys"
down_revision = "015_add_outcome_status_due_dates"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key_hash", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("consumer_type", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_api_keys_is_active", "api_keys", ["is_active"])

def downgrade() -> None:
    op.drop_index("ix_api_keys_is_active", table_name="api_keys")
    op.drop_table("api_keys")
