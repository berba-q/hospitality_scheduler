# Create check_manager.py in your FastAPI directory
from sqlmodel import Session, select
from app.models import User, Tenant
from app.deps import engine

with Session(engine) as session:
    # Check if manager exists
    manager = session.exec(
        select(User).where(User.email == "manager@example.com")
    ).first()
    
    if manager:
        print(f"✅ Manager found:")
        print(f"  Email: {manager.email}")
        print(f"  Is Manager: {manager.is_manager}")
        print(f"  Is Active: {manager.is_active}")
        print(f"  Tenant ID: {manager.tenant_id}")
        
        # Check tenant
        tenant = session.get(Tenant, manager.tenant_id)
        if tenant:
            print(f"  Tenant: {tenant.name}")
    else:
        print("❌ Manager not found in database")
        
        # Check all users
        all_users = session.exec(select(User)).all()
        print(f"All users in database:")
        for user in all_users:
            print(f"  - {user.email} (Manager: {user.is_manager})")