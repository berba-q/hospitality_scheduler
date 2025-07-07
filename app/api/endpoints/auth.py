from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from fastapi.security import OAuth2PasswordRequestForm

from ...deps import get_current_user, get_db
from ...models import User, Tenant
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
def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "is_manager": current_user.is_manager,
        "is_active": current_user.is_active,
        "tenant_id": str(current_user.tenant_id)
    }


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    statement = select(User).where(User.email == form_data.username)
    user = db.exec(statement).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_access_token(str(user.id))
    return Token(access_token=token)