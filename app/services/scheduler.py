from datetime import date
from typing import List, Sequence
from sqlmodel import Session, select

from .schedule_solver import generate_weekly_schedule

from app.models import (
    Schedule,
    ShiftAssignment,
    Staff,
    StaffUnavailability,
)


def create_schedule(
    db: Session,
    facility_id: str,
    week_start: date,
    *,
    days: int = 7,
    shifts_per_day: int = 3,
    hours_per_shift: int = 8,
) -> Schedule:
    # 1️⃣ Load active staff
    staff: Sequence[Staff] = db.exec(
        select(Staff).where(
            Staff.facility_id == facility_id,
            Staff.is_active.is_(True),
        )
    ).all()
    if not staff:
        raise ValueError("No staff found for that facility")

    # 2️⃣ Gather away periods inside the target week
    staff_ids = [s.id for s in staff]
    away_rows: Sequence[StaffUnavailability] = []
    if staff_ids:
        away_rows = db.exec(
            select(StaffUnavailability)
            .where(StaffUnavailability.staff_id.in_(staff_ids))
        ).all()

    away_tuples = []
    for ua in away_rows:
        day_idx = (ua.start.date() - week_start).days
        if 0 <= day_idx < days:
            shift_idx = 0  # TODO: derive from ua.start.hour if you model multiple shifts
            away_tuples.append((ua.staff_id, day_idx, shift_idx))

    # 3️⃣ Solve
    roster = generate_weekly_schedule(
        staff,
        unavailability=away_tuples,
        days=days,
        shifts_per_day=shifts_per_day,
        hours_per_shift=hours_per_shift,
    )

    # 4️⃣ Persist
    sched = Schedule(facility_id=facility_id, week_start=week_start)
    db.add(sched)
    db.flush()                        # get sched.id without second commit

    assignments = [
        ShiftAssignment(
            schedule_id=sched.id,
            day=r["day"],
            shift=r["shift"],
            staff_id=r["staff_id"],
        )
        for r in roster
    ]
    db.add_all(assignments)
    db.commit()
    db.refresh(sched)
    return sched