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
    op.create_table(
        "schedule",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("facility_id", sa.UUID(as_uuid=True), sa.ForeignKey("facility.id")),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_table(
        "shift_assignment",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("schedule_id", sa.UUID(as_uuid=True), sa.ForeignKey("schedule.id")),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("shift", sa.Integer(), nullable=False),
        sa.Column("staff_id", sa.UUID(as_uuid=True), sa.ForeignKey("staff.id")),
    )
    op.create_table(
        "staff_unavailability",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("staff_id", sa.UUID(as_uuid=True), sa.ForeignKey("staff.id")),
        sa.Column("start", sa.DateTime(), nullable=False),
        sa.Column("end", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
