"""check-in reminder log

Revision ID: 027_checkin_reminders
Revises: 026_data_consents
Create Date: 2026-10-26
"""

from alembic import op
import sqlalchemy as sa

revision = "027_checkin_reminders"
down_revision = "026_data_consents"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "checkin_reminders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("outcome_id", sa.Integer(), sa.ForeignKey("sme_outcomes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("reminder_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_sent_at", sa.DateTime(), nullable=True),
        sa.Column("last_sent_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("outcome_id", "interval_days", name="uq_reminder_outcome_interval"),
    )
    op.create_index("ix_checkin_reminders_id", "checkin_reminders", ["id"])
    op.create_index("ix_checkin_reminders_outcome_id", "checkin_reminders", ["outcome_id"])


def downgrade():
    op.drop_table("checkin_reminders")
