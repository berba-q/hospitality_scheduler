from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from fastapi.security import OAuth2PasswordRequestForm

from ...deps import get_current_user, get_db
from ...models import Facility, Staff, User, Tenant
from ...schemas import Token, UserCreate, UserRead
from ...core.security import verify_password, hash_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserRead, status_code=201)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # create tenant
    tenant = Tenant(name=user_in.tenant_name)
    db.add(tenant)
    db.flush()  # assign ID
    # create user
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        is_manager=True,
        tenant_id=tenant.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me")
def get_current_user_info(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information with proper name lookup"""
    
    # Default user info
    user_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.email,  # Fallback to email
        "is_manager": current_user.is_manager,
        "is_active": current_user.is_active,
        "tenant_id": str(current_user.tenant_id),
        "facility_id": None,
        "staff_id": None
    }
    
    # If user is staff (not manager), look up their staff record
    if not current_user.is_manager:
        staff = db.exec(
            select(Staff).join(Facility).where(
                Staff.email == current_user.email,
                Facility.tenant_id == current_user.tenant_id,
                Staff.is_active == True
            )
        ).first()
        
        if staff:
            user_data.update({
                "name": staff.full_name,  # ✅ Use actual full name from Staff table
                "facility_id": str(staff.facility_id),
                "staff_id": str(staff.id)
            })
    
    return user_data


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    statement = select(User).where(User.email == form_data.username)
    user = db.exec(statement).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    token = create_access_token(str(user.id))
    
    # Default user data
    user_data = {
        "id": str(user.id),
        "email": user.email,
        "name": user.email,  # Fallback to email
        "is_manager": user.is_manager,
        "is_active": user.is_active,
        "tenant_id": str(user.tenant_id),
        "facility_id": None,
        "staff_id": None
    }
    
    # Look up staff record to get full_name
    if not user.is_manager:
        staff = db.exec(
            select(Staff).join(Facility).where(
                Staff.email == user.email,
                Facility.tenant_id == user.tenant_id,
                Staff.is_active == True
            )
        ).first()
        
        if staff:
            user_data.update({
                "name": staff.full_name,  # Use actual full name from Staff table
                "facility_id": str(staff.facility_id),
                "staff_id": str(staff.id)
            })
    
    # Return both token AND proper user data
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data
    }