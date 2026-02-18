from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.db import get_db
from database.schemas import User, UserCreate
from handlers.user import create_user, get_user_by_email_or_phone

router = APIRouter()

@router.post("/signup", response_model=User, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_email_or_phone(db, email=user.email, phone_number=user.phone_number)
    if db_user:
        raise HTTPException(status_code=400, detail="Email or phone number already exists")
    return create_user(db, user)