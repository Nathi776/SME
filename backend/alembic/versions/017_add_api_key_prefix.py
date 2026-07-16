"""Add key_prefix column to api_keys

Revision ID: 017_add_api_key_prefix
Revises: 016_add_api_keys
Create Date: 2026-07-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "017_add_api_key_prefix"
down_revision = "016_add_api_keys"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("api_keys", sa.Column("key_prefix", sa.String(length=12), nullable=True))
    op.create_index("ix_api_keys_key_prefix", "api_keys", ["key_prefix"])

def downgrade() -> None:
    op.drop_index("ix_api_keys_key_prefix", table_name="api_keys")
    op.drop_column("api_keys", "key_prefix")
