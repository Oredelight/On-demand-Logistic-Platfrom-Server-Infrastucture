from fastapi import APIRouter, Depends, HTTPException, status, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User
from database.schemas import CartItemCreate, UserCreate, VerifyOTP, Token
from handlers.food import fetch_food_items, add_to_cart
from handlers.user import create_access_token, create_user, get_user_by_email_or_phone, verify_password, verify_user_email, customer_only

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

@router.get("/foods")
def get_foods(db: Session = Depends(get_db)):
    return fetch_food_items(db)

@router.post("/cart/add")
def add_cart(cart_item: CartItemCreate, user: User = Depends(customer_only), db: Session = Depends(get_db)):
    item = add_to_cart(
        db=db,
        user_id=user.id,
        food_id=cart_item.food_item_id,
        quantity=cart_item.quantity,
        protein=cart_item.protein,
        extras=cart_item.extras,
        instructions=cart_item.instructions
    )
    return {
        "message": "Item added to cart",
        "cart_item_id": item.id,
        "quantity": item.quantity
    }
    