"""Add verifications table

Revision ID: 005_add_verifications
Revises: 004_add_invoice_pdf_url
Create Date: 2026-06-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "005_add_verifications"
down_revision = "004_add_invoice_pdf_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "verifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doc_type", sa.String(), nullable=False),
        sa.Column("document_url", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("submitted_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("reviewer_notes", sa.String(), nullable=True),
        sa.Column("sme_id", sa.Integer(), sa.ForeignKey("smes.id"), nullable=True),
        sa.Column("lender_id", sa.Integer(), sa.ForeignKey("lenders.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("verifications")
