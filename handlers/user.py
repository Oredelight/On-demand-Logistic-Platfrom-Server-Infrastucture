import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

import redis
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database.db import get_db
from database.models import User
from database.schemas import TokenData, UserCreate, UserRole

logger = logging.getLogger(__name__)

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


def store_email_otp(email: str) -> str:
    otp = _generate_otp()
    hashed_otp = pwd_context.hash(otp)
    redis_client.setex(f"email_otp:{email}", settings.OTP_TTL_SECONDS, hashed_otp)
    # Reset attempt counter when issuing a fresh OTP
    redis_client.delete(f"otp_attempts:{email}")
    logger.info(f"[OTP] Stored OTP for {email}")
    return otp


def verify_email_otp(email: str, input_otp: str) -> bool:
    lockout_key = f"otp_lockout:{email}"
    attempts_key = f"otp_attempts:{email}"
    otp_key = f"email_otp:{email}"

    if redis_client.exists(lockout_key):
        ttl = redis_client.ttl(lockout_key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {ttl // 60} minutes."
        )

    stored_hash = redis_client.get(otp_key)
    if not stored_hash:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Request a new one.")

    if not pwd_context.verify(input_otp, stored_hash):
        attempts = redis_client.incr(attempts_key)
        redis_client.expire(attempts_key, settings.OTP_TTL_SECONDS)

        remaining = settings.OTP_MAX_ATTEMPTS - int(attempts)
        if remaining <= 0:
            redis_client.setex(lockout_key, settings.OTP_LOCKOUT_SECONDS, "1")
            redis_client.delete(otp_key, attempts_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Account locked for {settings.OTP_LOCKOUT_SECONDS // 60} minutes."
            )

        raise HTTPException(
            status_code=400,
            detail=f"Invalid OTP. {remaining} attempt(s) remaining."
        )

    #clean up
    redis_client.delete(otp_key, attempts_key)
    return True


def check_resend_rate_limit(email: str) -> None:
    key = f"otp_resend:{email}"
    count = redis_client.get(key)

    if count and int(count) >= settings.OTP_RESEND_MAX:
        ttl = redis_client.ttl(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many OTP requests. Try again in {ttl // 60} minutes."
        )

    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, settings.OTP_RESEND_WINDOW_SECONDS)
    pipe.execute()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(email: str) -> str:
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600

    redis_client.setex(f"refresh_token:{token_hash}", ttl, email)
    return raw_token


def verify_refresh_token(raw_token: str) -> str:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    email = redis_client.get(f"refresh_token:{token_hash}")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    return email


def revoke_refresh_token(raw_token: str) -> None:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    redis_client.delete(f"refresh_token:{token_hash}")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        role: str = payload.get("role")

        if email is None or token_type != "access":
            raise credentials_exception

        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception

    user = get_user_by_email_or_phone(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


def get_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please verify your email first."
        )
    return user


def customer_only(user: User = Depends(get_active_user)) -> User:
    if user.role != UserRole.CUSTOMER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Customers only"
        )
    return user

def get_user_by_email_or_phone(
    db: Session,
    email: str = None,
    phone_number: str = None
) -> Optional[User]:
    if email:
        return db.query(User).filter_by(email=email).first()
    elif phone_number:
        return db.query(User).filter_by(phone_number=phone_number).first()
    return None


def create_user(db: Session, user: UserCreate) -> User:
    referred_by_id = None

    if user.referral_code:
        referrer = db.query(User).filter(User.referral_code == user.referral_code).first()
        if not referrer:
            raise HTTPException(status_code=404, detail="Invalid referral code")
        referred_by_id = referrer.id

    hashed_password = get_password_hash(user.password)

    # Role is always forced to CUSTOMER for public signups.
    # Use the create_admin.py seed script to create admin accounts.
    db_user = User(
        email=user.email,
        phone_number=user.phone_number,
        hashed_password=hashed_password,
        role=UserRole.CUSTOMER.value,
        referred_by_user_id=referred_by_id,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    if user.email:
        otp = store_email_otp(user.email)
        try:
            from workers.tasks import send_otp_task
            send_otp_task.delay(email=user.email, otp=otp, purpose="signup")
            logger.info(f"[USER] OTP task dispatched for {user.email}")
        except Exception as e:
            logger.error(f"[USER] Failed to dispatch OTP task: {e}")

    return db_user


def verify_user_email(db: Session, email: str, otp: str) -> User:
    user = get_user_by_email_or_phone(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        raise HTTPException(status_code=400, detail="Email already verified")

    verify_email_otp(email, otp) 

    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


def resend_otp(db: Session, email: str) -> None:
    user = get_user_by_email_or_phone(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        raise HTTPException(status_code=400, detail="Email already verified")

    check_resend_rate_limit(email)

    otp = store_email_otp(email)
    try:
        from workers.tasks import send_otp_task
        send_otp_task.delay(email=email, otp=otp, purpose="resend")
    except Exception as e:
        logger.error(f"[USER] Failed to dispatch resend OTP task: {e}")
