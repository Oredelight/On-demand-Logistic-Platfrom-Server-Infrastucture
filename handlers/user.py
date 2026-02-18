from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database.models import User
from database.schemas import UserCreate
from fastapi import HTTPException, status

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user_by_email_or_phone(db: Session, email: str = None, phone_number: str = None):
    if email:
        return db.query(User).filter_by(email=email).first()
    elif phone_number:
        return db.query(User).filter_by(phone_number=phone_number).first()
    return None

def create_user(db: Session, user: UserCreate):
    referred_by_id = None

    if user.referral_code:
        referrer = db.query(User).filter(User.referral_code == user.referral_code).first()
        if not referrer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid referral code"
            )
        
        referred_by_id = referrer.id
        
    hashed_password = get_password_hash(user.password)

    db_user = User(
    email=user.email,
    phone_number=user.phone_number,
    referral_code=user.referral_code,
    hashed_password=hashed_password,
    referred_by_user_id=referred_by_id
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
