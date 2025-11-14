"""Add relationships between User, SME, Invoice, CreditScore, and FinanceRequest"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic
revision = 'new_revision_id'
down_revision = 'b7454c47f27b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # ✅ Helper: safely add a column if not already in table
    def add_column_if_not_exists(table_name, column):
        result = conn.execute(
            text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}';")
        )
        existing_columns = [row[0] for row in result]
        if column.name not in existing_columns:
            with op.batch_alter_table(table_name) as batch_op:
                batch_op.add_column(column)

    # Add SME foreign key columns safely
    add_column_if_not_exists('invoices', sa.Column('sme_id', sa.Integer(), sa.ForeignKey('smes.id')))
    add_column_if_not_exists('credit_scores', sa.Column('sme_id', sa.Integer(), sa.ForeignKey('smes.id')))
    add_column_if_not_exists('finance_requests', sa.Column('sme_id', sa.Integer(), sa.ForeignKey('smes.id')))


def downgrade():
    with op.batch_alter_table('invoices') as batch_op:
        batch_op.drop_column('sme_id')
    with op.batch_alter_table('credit_scores') as batch_op:
        batch_op.drop_column('sme_id')
    with op.batch_alter_table('finance_requests') as batch_op:
        batch_op.drop_column('sme_id')
