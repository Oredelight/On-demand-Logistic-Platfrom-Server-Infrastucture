from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database.models import User
from fastapi import HTTPException, status
import redis
import random

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

OTP_TTL = 300

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

def generate_otp():
    return str(random.randint(100000, 999999))

def store_email_otp(email:str):
    otp = generate_otp()
    hashed_otp = pwd_context.hash(otp)

    redis_client.setex(f"email_otp:{email}", OTP_TTL, hashed_otp)

    return otp

def verify_email_otp(email: str, input_otp: str) -> bool:
    key = f"email_otp:{email}"
    stored_hash = redis_client.get(key)

    if not stored_hash:
        return False
    if not pwd_context.verify(input_otp, stored_hash):
        return False
    
    redis_client.delete(key)
    return True

def create_user(db: Session, user: User):
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

    otp = store_email_otp(user.email)  
    print("EMAIL OTP:", otp)    #Remember to remove later

    return db_user

def verify_user_email(db: Session, email: str, otp: str):
    user = get_user_by_email_or_phone(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        raise HTTPException(status_code=400, detail="Email already verified")
    if not verify_email_otp(email, otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user
