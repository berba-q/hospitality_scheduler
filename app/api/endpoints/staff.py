from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from ...deps import get_db, get_current_user
from ...models import Staff, Facility
from ...schemas import StaffCreate, StaffRead

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("/", response_model=StaffRead, status_code=201)
def create_staff(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    facility = db.get(Facility, staff_in.facility_id)
    if not facility or facility.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid facility")
    staff = Staff(**staff_in.dict())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/", response_model=list[StaffRead])
def list_staff(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    statement = (
        select(Staff)
        .join(Facility)
        .where(Facility.tenant_id == current_user.tenant_id)
    )
    return db.exec(statement).all()