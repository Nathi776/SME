"""finance request messages (lender questions and SME answers)

Revision ID: 029_finance_request_messages
Revises: 028_merge_migration_heads
Create Date: 2026-10-31
"""

from alembic import op
import sqlalchemy as sa

revision = "029_finance_request_messages"
down_revision = "028_merge_migration_heads"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "finance_request_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("finance_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("author_role", sa.String(20), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_finance_request_messages_id", "finance_request_messages", ["id"])
    op.create_index("ix_finance_request_messages_request_id", "finance_request_messages", ["request_id"])


def downgrade():
    op.drop_table("finance_request_messages")
