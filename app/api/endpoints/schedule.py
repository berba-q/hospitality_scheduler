from datetime import date
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.schemas import ScheduleRead, ScheduleDetail
from app.services.scheduler import generate_weekly_schedule
from typing import List
#from app.services.scheduler import generate_weekly_schedule
from app.models import ShiftAssignment, Schedule, Staff, Facility
from app.services.scheduler import create_schedule
from app.models import Staff, Schedule
from app.deps import get_db

from pydantic import BaseModel

router = APIRouter()

class PreviewRequest(BaseModel):
    staff_ids: List[str]
    days: int = 7
    shifts_per_day: int = 3

@router.post("/preview")
def preview_schedule(body: PreviewRequest, db: Session = Depends(get_db)):
    staff = db.exec(select(Staff).where(Staff.id.in_(body.staff_ids))).all()
    roster = generate_weekly_schedule(
        staff,
        days=body.days,
        shifts_per_day=body.shifts_per_day,
    )
    return {"roster": roster}

class GenerateRequest(BaseModel):
    facility_id: str
    week_start: date

@router.post("/", response_model=ScheduleRead)
def generate(body: GenerateRequest, db: Session = Depends(get_db)):
    sched = create_schedule(db, body.facility_id, body.week_start)
    return sched

@router.get("/{schedule_id}", response_model=ScheduleDetail)
def get_schedule(schedule_id: str, db: Session = Depends(get_db)):
    return db.get(Schedule, schedule_id)