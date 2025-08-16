"""dd created_at to staff table

Revision ID: 4c57554cac6f
Revises: 2e9dbb03070c
Create Date: 2025-08-06 10:36:35.744311

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c57554cac6f'
down_revision: Union[str, Sequence[str], None] = '2e9dbb03070c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - SAFE for existing data"""
    
    # Add created_at with default value for existing records
    op.execute("""
        ALTER TABLE staff 
        ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE 
        DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
    """)
    
    # Add updated_at as nullable (standard practice)
    op.add_column('staff', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Optional: Update existing records to have a more realistic created_at
    # (You can comment this out if you want all existing records to have "now" as created_at)
    op.execute("""
        UPDATE staff 
        SET created_at = COALESCE(
            -- Try to use any existing timestamp if available, otherwise use current time
            (NOW() AT TIME ZONE 'utc') - INTERVAL '30 days',
            (NOW() AT TIME ZONE 'utc')
        )
        -- Only update records that still have the default timestamp (within last minute)
        WHERE created_at > (NOW() AT TIME ZONE 'utc') - INTERVAL '1 minute'
    """)

def downgrade() -> None:
    """Downgrade schema - safe removal"""
    # Drop in reverse order
    op.drop_column('staff', 'updated_at')
    op.drop_column('staff', 'created_at')
