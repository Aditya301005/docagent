"""add file_hash to documents

Revision ID: a3b8c9d2e1f0
Revises: f348df8a0d8f
Create Date: 2026-04-23 04:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b8c9d2e1f0'
down_revision: Union[str, Sequence[str], None] = 'f348df8a0d8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add file_hash column and index to documents table for duplicate detection."""
    op.add_column('documents', sa.Column('file_hash', sa.String(), nullable=True))
    op.create_index('ix_documents_file_hash', 'documents', ['file_hash'], unique=False)


def downgrade() -> None:
    """Remove file_hash column from documents table."""
    op.drop_index('ix_documents_file_hash', table_name='documents')
    op.drop_column('documents', 'file_hash')
