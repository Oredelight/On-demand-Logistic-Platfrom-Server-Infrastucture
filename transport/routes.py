from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.db import get_db
from database.schemas import UserCreate, VerifyOTP
from handlers.user import create_user, get_user_by_email_or_phone, verify_user_email

router = APIRouter()

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email_or_phone(db, email=user.email, phone_number=user.phone_number)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or phone number already exists")
    
    create_user(db, user)
    return {"message": "User created successfully. Please verify your email with the OTP sent."}

@router.post("/verify")
def verify_email(data: VerifyOTP, db: Session = Depends(get_db)):
    verify_user_email(db, email=data.email, otp=data.otp)
    return {"message": "Email verified successfully"}