import re
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List, Optional

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
    
class FoodItemCreate(BaseModel):
    name: str
    description: str
    price: float

class FoodItemUpdate(BaseModel):
    item_name: str | None = None
    description: str | None = None
    price: float | None = None
    available: bool | None = None

class CartItemCreate(BaseModel):
    food_item_id: int
    quantity: int
    protein_id: Optional[int] = None
    extras_id: Optional[List[int]] = []
    instructions: Optional[str] = None

    class Config:
        orm_mode = True

class OrderStatus(str, Enum):
    PENDING = "Pending"
    PROCESSING = "Processing"
    SHIPPED = "Shipped"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"

class UpdateOrderStatusRequest(BaseModel):
    new_status: str  