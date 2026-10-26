"""merge the two migration heads

The repository had two heads: the numbered chain (ending 027) and
ef19b60e305f (per-verification bank statement columns), which branched off
eb2a48d747da. `alembic upgrade head` refuses to run with two heads. The two
branches touch different columns, so this merge is a no-op that joins them.

Revision ID: 028_merge_migration_heads
Revises: 027_checkin_reminders, ef19b60e305f
Create Date: 2026-10-26
"""

revision = "028_merge_migration_heads"
down_revision = ("027_checkin_reminders", "ef19b60e305f")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
