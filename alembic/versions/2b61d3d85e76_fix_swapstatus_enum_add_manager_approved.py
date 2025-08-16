"""fix swapstatus enum add manager_approved

Revision ID: 2b61d3d85e76
Revises: 68d13a4ad083
Create Date: 2025-07-24 06:26:55.515039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b61d3d85e76'
down_revision: Union[str, Sequence[str], None] = '68d13a4ad083'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing MANAGER_APPROVED value and fix case to match Python enum."""
    
    # Step 1: Drop indexes that reference the status column first!
    # This prevents the varchar <> enum comparison error
    op.execute("DROP INDEX IF EXISTS idx_unique_active_swap_request;")
    op.execute("DROP INDEX IF EXISTS idx_unique_auto_assignment;")
    op.execute("DROP INDEX IF EXISTS idx_unique_specific_swap;")
    
    # Step 2: Convert column to varchar to safely modify enum
    op.execute("ALTER TABLE swaprequest ALTER COLUMN status TYPE varchar(50);")
    
    # Step 3: Update existing data to lowercase format
    op.execute("""
        UPDATE swaprequest 
        SET status = CASE 
            WHEN status = 'PENDING' THEN 'pending'
            WHEN status = 'MANAGER_APPROVED' THEN 'manager_approved'
            WHEN status = 'POTENTIAL_ASSIGNMENT' THEN 'potential_assignment'
            WHEN status = 'STAFF_ACCEPTED' THEN 'staff_accepted'
            WHEN status = 'MANAGER_FINAL_APPROVAL' THEN 'manager_final_approval'
            WHEN status = 'EXECUTED' THEN 'executed'
            WHEN status = 'STAFF_DECLINED' THEN 'staff_declined'
            WHEN status = 'ASSIGNMENT_DECLINED' THEN 'assignment_declined'
            WHEN status = 'ASSIGNMENT_FAILED' THEN 'assignment_failed'
            WHEN status = 'DECLINED' THEN 'declined'
            WHEN status = 'CANCELLED' THEN 'cancelled'
            ELSE LOWER(status)
        END;
    """)
    
    # Step 4: Drop old enum and create new one with correct lowercase values
    op.execute("DROP TYPE IF EXISTS swapstatus;")
    
    op.execute("""
        CREATE TYPE swapstatus AS ENUM (
            'pending',
            'manager_approved',
            'potential_assignment',
            'staff_accepted',
            'manager_final_approval',
            'executed',
            'staff_declined',
            'assignment_declined',
            'assignment_failed',
            'declined',
            'cancelled'
        );
    """)
    
    # Step 5: Convert column back to use the new enum type
    op.execute("""
        ALTER TABLE swaprequest 
        ALTER COLUMN status TYPE swapstatus 
        USING status::swapstatus;
    """)
    
    # Step 6: Recreate indexes with lowercase enum values
    op.execute("""
        CREATE UNIQUE INDEX idx_unique_active_swap_request 
        ON swaprequest (schedule_id, requesting_staff_id, original_day, original_shift)
        WHERE status NOT IN ('executed','declined','cancelled','staff_declined','assignment_failed');
    """)
    
    op.execute("""
        CREATE UNIQUE INDEX idx_unique_auto_assignment 
        ON swaprequest (schedule_id, assigned_staff_id, original_day, original_shift)
        WHERE swap_type = 'auto' AND assigned_staff_id IS NOT NULL 
        AND status IN ('potential_assignment', 'staff_accepted', 'manager_final_approval');
    """)
    
    op.execute("""
        CREATE UNIQUE INDEX idx_unique_specific_swap 
        ON swaprequest (schedule_id, requesting_staff_id, target_staff_id, original_day, original_shift, target_day, target_shift)
        WHERE swap_type = 'specific' AND status NOT IN ('executed','declined','cancelled','staff_declined');
    """)


def downgrade() -> None:
    """Revert to the original uppercase enum."""
    
    # Step 1: Drop the new indexes first
    op.execute("DROP INDEX IF EXISTS idx_unique_active_swap_request;")
    op.execute("DROP INDEX IF EXISTS idx_unique_auto_assignment;")
    op.execute("DROP INDEX IF EXISTS idx_unique_specific_swap;")
    
    # Step 2: Convert column to varchar
    op.execute("ALTER TABLE swaprequest ALTER COLUMN status TYPE varchar(50);")
    
    # Step 3: Update data back to uppercase
    op.execute("""
        UPDATE swaprequest 
        SET status = CASE 
            WHEN status = 'pending' THEN 'PENDING'
            WHEN status = 'manager_approved' THEN 'PENDING'  -- Fallback since old enum didn't have this
            WHEN status = 'potential_assignment' THEN 'POTENTIAL_ASSIGNMENT'
            WHEN status = 'staff_accepted' THEN 'STAFF_ACCEPTED'
            WHEN status = 'manager_final_approval' THEN 'MANAGER_FINAL_APPROVAL'
            WHEN status = 'executed' THEN 'EXECUTED'
            WHEN status = 'staff_declined' THEN 'STAFF_DECLINED'
            WHEN status = 'assignment_declined' THEN 'ASSIGNMENT_DECLINED'
            WHEN status = 'assignment_failed' THEN 'ASSIGNMENT_FAILED'
            WHEN status = 'declined' THEN 'DECLINED'
            WHEN status = 'cancelled' THEN 'CANCELLED'
            ELSE UPPER(status)
        END;
    """)
    
    # Step 4: Drop the new enum and recreate the original
    op.execute("DROP TYPE IF EXISTS swapstatus;")
    
    # Recreate the original enum (without MANAGER_APPROVED)
    op.execute("""
        CREATE TYPE swapstatus AS ENUM (
            'PENDING',
            'POTENTIAL_ASSIGNMENT',
            'STAFF_ACCEPTED',
            'MANAGER_FINAL_APPROVAL',
            'EXECUTED',
            'STAFF_DECLINED',
            'ASSIGNMENT_DECLINED',
            'ASSIGNMENT_FAILED',
            'DECLINED',
            'CANCELLED'
        );
    """)
    
    # Step 5: Convert column back to use the enum type
    op.execute("""
        ALTER TABLE swaprequest 
        ALTER COLUMN status TYPE swapstatus 
        USING status::swapstatus;
    """)
    
    # Step 6: Recreate original indexes with uppercase values
    op.execute("""
        CREATE UNIQUE INDEX idx_unique_active_swap_request 
        ON swaprequest (schedule_id, requesting_staff_id, original_day, original_shift)
        WHERE status NOT IN ('EXECUTED','DECLINED','CANCELLED','STAFF_DECLINED','ASSIGNMENT_FAILED');
    """)
    
    op.execute("""
        CREATE UNIQUE INDEX idx_unique_auto_assignment 
        ON swaprequest (schedule_id, assigned_staff_id, original_day, original_shift)
        WHERE swap_type = 'auto' AND assigned_staff_id IS NOT NULL 
        AND status IN ('POTENTIAL_ASSIGNMENT', 'STAFF_ACCEPTED', 'MANAGER_FINAL_APPROVAL');
    """)
    
    op.execute("""
        CREATE UNIQUE INDEX idx_unique_specific_swap 
        ON swaprequest (schedule_id, requesting_staff_id, target_staff_id, original_day, original_shift, target_day, target_shift)
        WHERE swap_type = 'specific' AND status NOT IN ('EXECUTED','DECLINED','CANCELLED','STAFF_DECLINED');
    """)