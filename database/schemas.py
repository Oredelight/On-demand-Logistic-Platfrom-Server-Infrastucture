import re
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional

class UserRole(str, Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"

class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    referral_code: Optional[str] = None
    password: str = Field(min_length= 8, max_length= 72)
    role: Optional[UserRole] = UserRole.CUSTOMER

    @model_validator(mode="before")
    def validate_email_or_phone(values: any) -> any:
        if isinstance(values, dict):
                email = values.get("email")
                phone_number = values.get("phone_number")

                if not email and not phone_number:
                        raise ValueError("Either email or phone number must be provided.")
                
                if phone_number and not re.match(r'^\+?[1-9]\d{7,14}$', phone_number):
                        raise ValueError("Invalid phone number format.")
                
        return values
   
class User(BaseModel):
    id: int
    is_active: bool

    class Config:
        orm_mode = True

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None  
    
class FoodItemcCreate(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int
    price: float
    available: bool

class FoodItem(BaseModel):
    id: int
    owner_id: int

    class Config:
        orm_mode = True

class CartItemCreate(BaseModel):
    food_item_id: int
    quantity: int
    protein: Optional[str] = None
    extras: Optional[str] = None
    instructions: Optional[str] = None

    class Config:
        orm_mode = True

class OrderCreate(BaseModel):
    food_item_id: int
    quantity: int
    total_price: float
    current_status: Optional[str] = "pending"

class Order(BaseModel):
    id: int
    user_id: int
    status: str

    class Config:
        orm_mode = True

class OrderStatusLogCreate(BaseModel):
    order_id: int
    old_status: str
    new_status: str
    timestamp: str    

class OrderStatusLog(BaseModel):
    id: int
    order_id: int
    old_status: str
    new_status: str
    timestamp: str

    class Config:
        orm_mode = True

class RatingCreate(BaseModel):
    food_item_id: int
    rating: int
    comment: Optional[str] = None  

class Rating(BaseModel):
    id: int
    user_id: int

    class Config:
        orm_mode = True

