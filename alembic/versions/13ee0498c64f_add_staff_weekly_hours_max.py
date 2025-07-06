"""add staff weekly_hours_max

Revision ID: 13ee0498c64f
Revises: bfe95ab3c206
Create Date: 2025-07-05 11:52:43.009886

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13ee0498c64f'
down_revision: Union[str, Sequence[str], None] = 'bfe95ab3c206'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute(
        """
        ALTER TABLE staff
        ADD COLUMN IF NOT EXISTS skill_level INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS weekly_hours_max INTEGER DEFAULT 40
        """
    )

def downgrade():
    op.execute(
        """
        ALTER TABLE staff
        DROP COLUMN IF EXISTS weekly_hours_max,
        DROP COLUMN IF EXISTS skill_level
        """
    )