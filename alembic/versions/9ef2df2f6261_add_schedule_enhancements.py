"""add schedule enhancements

Revision ID: 9ef2df2f6261
Revises: e5963a09ba3f
Create Date: 2025-07-07 19:38:58.464793

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ef2df2f6261'
down_revision: Union[str, Sequence[str], None] = 'e5963a09ba3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create zone_assignment table
    op.create_table('zone_assignment',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('schedule_id', sa.Uuid(), nullable=False),
        sa.Column('staff_id', sa.Uuid(), nullable=False),
        sa.Column('zone_id', sa.String(), nullable=False),
        sa.Column('day', sa.Integer(), nullable=False),
        sa.Column('shift', sa.Integer(), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['schedule_id'], ['schedule.id'], ),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create schedule_template table
    op.create_table('schedule_template',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('facility_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('template_data', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('tags', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('used_count', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['facility_id'], ['facility.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create schedule_optimization table
    op.create_table('schedule_optimization',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('schedule_id', sa.Uuid(), nullable=False),
        sa.Column('optimization_type', sa.String(), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('results', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime()),
        sa.ForeignKeyConstraint(['schedule_id'], ['schedule.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes for performance
    op.create_index('idx_zone_assignment_schedule', 'zone_assignment', ['schedule_id'])
    op.create_index('idx_zone_assignment_staff', 'zone_assignment', ['staff_id'])
    op.create_index('idx_zone_assignment_zone_day_shift', 'zone_assignment', ['zone_id', 'day', 'shift'])
    
    op.create_index('idx_schedule_template_facility', 'schedule_template', ['facility_id'])
    op.create_index('idx_schedule_template_public', 'schedule_template', ['is_public'])
    
    op.create_index('idx_schedule_optimization_schedule', 'schedule_optimization', ['schedule_id'])
    op.create_index('idx_schedule_optimization_status', 'schedule_optimization', ['status'])
    
    # Add additional columns to existing tables
    
    # Enhance scheduleconfig table with additional JSON fields for role requirements
    op.add_column('scheduleconfig', 
        sa.Column('zone_configurations', sa.JSON(), server_default='{}')
    )
    op.add_column('scheduleconfig', 
        sa.Column('optimization_settings', sa.JSON(), server_default='{}')
    )
    
    # Add analytics tracking to schedule table
    op.add_column('schedule', 
        sa.Column('generation_method', sa.String(), server_default='manual')
    )
    op.add_column('schedule', 
        sa.Column('optimization_score', sa.Float())
    )
    op.add_column('schedule', 
        sa.Column('last_modified', sa.DateTime(), server_default=sa.func.now())
    )
    
    # Recreate missing tables if they were dropped (based on your migration history)
    # Check if shift_assignment table exists, if not create it
    op.execute("""
        CREATE TABLE IF NOT EXISTS shift_assignment (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            schedule_id UUID REFERENCES schedule(id),
            day INTEGER NOT NULL,
            shift INTEGER NOT NULL,
            staff_id UUID REFERENCES staff(id)
        );
    """)
    
    # Check if staff_unavailability table exists, if not create it
    op.execute("""
        CREATE TABLE IF NOT EXISTS staff_unavailability (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            staff_id UUID REFERENCES staff(id),
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            reason TEXT,
            is_recurring BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    # ### end Alembic commands ###


def downgrade() -> None:
    # Remove added columns
    op.drop_column('schedule', 'last_modified')
    op.drop_column('schedule', 'optimization_score')
    op.drop_column('schedule', 'generation_method')
    
    op.drop_column('scheduleconfig', 'optimization_settings')
    op.drop_column('scheduleconfig', 'zone_configurations')
    
    # Drop indexes
    op.drop_index('idx_schedule_optimization_status', table_name='schedule_optimization')
    op.drop_index('idx_schedule_optimization_schedule', table_name='schedule_optimization')
    op.drop_index('idx_schedule_template_public', table_name='schedule_template')
    op.drop_index('idx_schedule_template_facility', table_name='schedule_template')
    op.drop_index('idx_zone_assignment_zone_day_shift', table_name='zone_assignment')
    op.drop_index('idx_zone_assignment_staff', table_name='zone_assignment')
    op.drop_index('idx_zone_assignment_schedule', table_name='zone_assignment')
    
    # Drop tables
    op.drop_table('schedule_optimization')
    op.drop_table('schedule_template')
    op.drop_table('zone_assignment')
    # ### end Alembic commands ###
