"""update swap request status values

Revision ID: 1f1906d93afd
Revises: 3f3f4aadc92e
Create Date: 2025-07-12 00:23:06.585003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f1906d93afd'
down_revision: Union[str, Sequence[str], None] = '3f3f4aadc92e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update existing status values to new format"""
    
    # Update 'approved' to 'manager_approved'
    op.execute(
        "UPDATE swaprequest SET status = 'manager_approved' WHERE status = 'approved'"
    )
    
    # Update 'completed' to 'executed'
    op.execute(
        "UPDATE swaprequest SET status = 'executed' WHERE status = 'completed'"
    )


def downgrade() -> None:
    """Revert status values to old format"""
    
    # Revert 'manager_approved' back to 'approved'
    op.execute(
        "UPDATE swaprequest SET status = 'approved' WHERE status = 'manager_approved'"
    )
    
    # Revert 'executed' back to 'completed'
    op.execute(
        "UPDATE swaprequest SET status = 'completed' WHERE status = 'executed'"
    )
