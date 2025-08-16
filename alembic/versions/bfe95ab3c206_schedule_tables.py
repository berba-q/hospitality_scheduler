"""schedule tables

Revision ID: bfe95ab3c206
Revises: 
Create Date: 2025-07-05 11:04:36.141988

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bfe95ab3c206'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create base tables with no dependencies first
    op.create_table(
        "tenant",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
    )
    
    # 2. Tables that depend only on tenant
    op.create_table(
        "user",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.UUID(as_uuid=True), sa.ForeignKey("tenant.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_manager", sa.Boolean(), default=False),
        sa.Column("is_active", sa.Boolean(), default=True),
    )
    
    op.create_table(
        "facility",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.UUID(as_uuid=True), sa.ForeignKey("tenant.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(500), nullable=True),
    )
    
    # 3. Tables that depend on facility
    op.create_table(
        "staff",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("facility_id", sa.UUID(as_uuid=True), sa.ForeignKey("facility.id"), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("role", sa.String(100), nullable=False),
        sa.Column("skill_level", sa.Integer(), nullable=True, default=1),
        sa.Column("weekly_hours_max", sa.Integer(), nullable=True, default=40),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
    )
    
    op.create_table(
        "schedule",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("facility_id", sa.UUID(as_uuid=True), sa.ForeignKey("facility.id"), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    
    # 4. Tables that depend on staff
    op.create_table(
        "staff_unavailability",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("staff_id", sa.UUID(as_uuid=True), sa.ForeignKey("staff.id"), nullable=False),
        sa.Column("start", sa.DateTime(), nullable=False),
        sa.Column("end", sa.DateTime(), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("is_recurring", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    
    # 5. Tables that depend on multiple other tables
    op.create_table(
        "shift_assignment",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("schedule_id", sa.UUID(as_uuid=True), sa.ForeignKey("schedule.id"), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("shift", sa.Integer(), nullable=False),
        sa.Column("staff_id", sa.UUID(as_uuid=True), sa.ForeignKey("staff.id"), nullable=False),
    )


def downgrade() -> None:
    # Drop in reverse order
    op.drop_table('shift_assignment')
    op.drop_table('staff_unavailability') 
    op.drop_table('schedule')
    op.drop_table('staff')
    op.drop_table('facility')
    op.drop_table('user')
    op.drop_table('tenant')