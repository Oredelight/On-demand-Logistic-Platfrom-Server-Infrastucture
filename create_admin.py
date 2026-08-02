import sys
import getpass

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, ".")

from database.db import SessionLocal
from database.models import User
from database.schemas import UserRole
from handlers.user import get_password_hash


def create_admin() -> None:
    print("\n[*] Admin Account Creator")
    print("-" * 35)

    email = input("Admin email: ").strip().lower()
    if not email:
        print("[ERROR] Email cannot be empty.")
        sys.exit(1)

    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8:
        print("[ERROR] Password must be at least 8 characters.")
        sys.exit(1)

    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("[ERROR] Passwords do not match.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter_by(email=email).first()
        if existing:
            if existing.role == UserRole.ADMIN.value:
                print(f"[WARN] An admin with email '{email}' already exists.")
            else:
                # Upgrade existing customer to admin
                existing.role = UserRole.ADMIN.value
                existing.is_active = True
                db.commit()
                print(f"[OK] User '{email}' has been upgraded to admin.")
            return

        admin = User(
            email=email,
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN.value,
            is_active=True,   # no OTP needed for seeded admin
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"\n[OK] Admin account created successfully!")
        print(f"   Email : {admin.email}")
        print(f"   Role  : {admin.role}")
        print(f"   ID    : {admin.id}\n")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
