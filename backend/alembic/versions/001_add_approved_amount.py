"""Add approved_amount column to finance_requests

Revision ID: 001_add_approved_amount
Revises: 
Create Date: 2026-01-25 09:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_add_approved_amount'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to finance_requests
    op.add_column('finance_requests', sa.Column('approved_amount', sa.Float(), nullable=True))
    op.add_column('finance_requests', sa.Column('fee_rate', sa.Float(), server_default='0'))
    op.add_column('finance_requests', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('finance_requests', sa.Column('credit_score_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove the columns
    op.drop_column('finance_requests', 'approved_amount')
    op.drop_column('finance_requests', 'fee_rate')
    op.drop_column('finance_requests', 'approved_at')
    op.drop_column('finance_requests', 'credit_score_id')
