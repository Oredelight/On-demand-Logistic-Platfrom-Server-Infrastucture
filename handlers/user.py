from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database.models import User
from database.schemas import TokenData, UserRole
from database.db import get_db
from fastapi import HTTPException, status, Depends
import redis
import random
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

OTP_TTL = 300

SECRET_KEY = "YOUDONTKNOWITDURHHHH"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
    user = get_user_by_email_or_phone(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

def customer_only(user: User = Depends(get_current_user)):
    if user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden: Customers only")
    return user

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
    role=user.role,
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
