from faker import Faker
from sqlmodel import SQLModel, Session, select, create_engine
from app.models import Tenant, Facility, Staff, User
from app.core.security import get_password_hash
from app.core.config import get_settings
from random import choice

fake = Faker()
settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)

def seed():
    SQLModel.metadata.create_all(engine)    # ensure tables exist
    with Session(engine) as session:
        tenant = Tenant(name="Demo Hospitality Group")
        session.add(tenant)
        session.commit()
        session.refresh(tenant)

        seaside = Facility(name="Seaside Hotel", tenant_id=tenant.id)
        bistro  = Facility(name="Downtown Bistro", tenant_id=tenant.id)
        session.add_all([seaside, bistro])
        session.commit()         # flush so seaside.id & bistro.id are available

        fac_ids = [seaside.id, bistro.id]

        staff_objs = [
            Staff(
                full_name=fake.name(),
                role=fake.random_element(elements=("Housekeeping", "Chef", "Front Desk")),
                tenant_id=tenant.id,
                facility_id=choice(fac_ids),   # ensure NOT NULL
            )
            for _ in range(10)
        ]
        session.add_all(staff_objs)

        exists = session.exec(select(User).where(User.email == "manager@example.com")).first()
        if not exists:
            manager = User(
                email="manager@example.com",
                hashed_password=get_password_hash("changeme"),
                tenant_id=tenant.id,
                is_superuser=True,
            )
            session.add(manager)

        session.commit()
    print("✅ Demo data inserted.")

if __name__ == "__main__":
    seed()