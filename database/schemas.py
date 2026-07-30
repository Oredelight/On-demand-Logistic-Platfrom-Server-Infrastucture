import re
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List, Optional

class UserRole(str, Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"


class OrderStatus(str, Enum):
    PENDING = "Pending"
    PROCESSING = "Processing"
    SHIPPED = "Shipped"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"

class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    referral_code: Optional[str] = None
    password: str = Field(min_length=8, max_length=72)
    # role is intentionally excluded — public signup is always CUSTOMER.
    # Admins are created via the create_admin.py seed script.

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


class ResendOTPRequest(BaseModel):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserProfile(BaseModel):
    id: int
    email: Optional[str] = None
    phone_number: Optional[str] = None
    role: str
    referral_code: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AddressCreate(BaseModel):
    label: str = Field(max_length=100, examples=["Home", "Office"])
    street: str = Field(max_length=255)
    city: str = Field(max_length=100)
    state: str = Field(max_length=100)
    landmark: Optional[str] = Field(default=None, max_length=255)
    is_default: Optional[bool] = False


class AddressResponse(BaseModel):
    id: int
    label: str
    street: str
    city: str
    state: str
    landmark: Optional[str] = None
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True

class FoodItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None


class FoodItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    available: bool

    class Config:
        from_attributes = True


class FoodItemUpdate(BaseModel):
    name: str
    description: str
    price: float
    available: bool
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class ProteinCreate(BaseModel):
    name: str
    price: float


class ExtrasCreate(BaseModel):
    name: str
    price: float


class CartItemCreate(BaseModel):
    food_item_id: int
    quantity: int = Field(ge=1)
    protein_id: Optional[int] = None
    extras_id: Optional[List[int]] = []
    instructions: Optional[str] = None


class OrderItemResponse(BaseModel):
    food: str
    protein: Optional[str] = None
    extras: List[str]
    unit_price: float
    quantity: int
    item_total: float


class OrderResponse(BaseModel):
    order_id: int
    status: str
    payment_status: str
    subtotal: float
    delivery_fee: float
    service_fee: float
    tax: float
    total: float
    instructions: Optional[str] = None
    items: List[OrderItemResponse]
    created_at: datetime


class UpdateOrderStatusRequest(BaseModel):
    new_status: str


class PaymentInitiateRequest(BaseModel):
    order_id: int


class PaymentInitiateResponse(BaseModel):
    authorization_url: str
    reference: str
    order_id: int
    amount_ngn: float


class PaymentVerifyResponse(BaseModel):
    reference: str
    status: str
    amount_ngn: float
    channel: Optional[str] = None
    paid_at: Optional[datetime] = None
    order_id: int
