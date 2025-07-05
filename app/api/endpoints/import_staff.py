from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlmodel import Session
import pandas as pd

from ...deps import get_db, get_current_user
from ...models import Staff, Facility

router = APIRouter(prefix="/import", tags=["import"])


REQUIRED_COLUMNS = {"full_name", "role", "skill_level", "facility_id"}


@router.post("/staff", status_code=201)
def import_staff(
    file: UploadFile = File(...), db: Session = Depends(get_db), current_user = Depends(get_current_user)
):
    if not file.filename.endswith((".csv", ".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Parse file into DataFrame
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        else:
            df = pd.read_excel(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")

    added, updated, errors = 0, 0, []

    for idx, row in df.iterrows():
        facility = db.get(Facility, row["facility_id"])
        if not facility or facility.tenant_id != current_user.tenant_id:
            errors.append((idx, "Invalid facility"))
            continue
        staff = Staff(
            facility_id=row["facility_id"],
            full_name=row["full_name"],
            role=row["role"],
            skill_level=int(row.get("skill_level", 1)),
            phone=row.get("phone"),
        )
        db.add(staff)
        added += 1
    db.commit()
    return {"added": added, "updated": updated, "errors": errors}