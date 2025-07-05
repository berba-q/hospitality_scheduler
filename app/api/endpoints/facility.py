from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from ...deps import get_db, get_current_user
from ...models import Facility
from ...schemas import FacilityCreate, FacilityRead

router = APIRouter(prefix="/facilities", tags=["facility"])


@router.post("/", response_model=FacilityRead, status_code=201)
def create_facility(
    facility_in: FacilityCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    facility = Facility(tenant_id=current_user.tenant_id, **facility_in.dict())
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility


@router.get("/", response_model=list[FacilityRead])
def list_facilities(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    statement = select(Facility).where(Facility.tenant_id == current_user.tenant_id)
    return db.exec(statement).all()
