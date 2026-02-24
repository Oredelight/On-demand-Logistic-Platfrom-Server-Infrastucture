from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.db import get_db
from database.schemas import UserCreate, VerifyOTP, Token
from handlers.user import create_access_token, create_user, get_user_by_email_or_phone, verify_password, verify_user_email

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

@router.post("/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email_or_phone(db, email=user.email)
    if not existing_user or not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(status_code=404, detail="User not found or incorrect password")
    
    access_token = create_access_token(data={"sub": existing_user.email, "role": existing_user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": existing_user.role}