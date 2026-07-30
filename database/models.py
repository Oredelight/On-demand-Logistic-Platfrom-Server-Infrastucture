from datetime import datetime
from utils.referral import generate_referral_code
from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SAEnum, ForeignKey,
    Integer, String, Float, Table, Text
)
from sqlalchemy.orm import relationship
from database.db import Base
from database.schemas import OrderStatus, PaymentStatus, UserRole

food_proteins = Table(
    "food_proteins",
    Base.metadata,
    Column("food_id", Integer, ForeignKey("food_items.id", ondelete="CASCADE")),
    Column("protein_id", Integer, ForeignKey("proteins.id", ondelete="CASCADE"))
)

cart_item_extras = Table(
    "cart_item_extras",
    Base.metadata,
    Column("cart_item_id", Integer, ForeignKey("cart_items.id", ondelete="CASCADE")),
    Column("extra_id", Integer, ForeignKey("extras.id", ondelete="CASCADE"))
)

order_item_extras = Table(
    "order_item_extras",
    Base.metadata,
    Column("order_item_id", Integer, ForeignKey("order_items.id", ondelete="CASCADE")),
    Column("extra_id", Integer, ForeignKey("extras.id", ondelete="CASCADE"))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone_number = Column(String(20), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.CUSTOMER.value)
    referral_code = Column(String(20), unique=True, index=True, default=generate_referral_code)
    referred_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    referred_by = relationship("User", remote_side=[id], backref="referrals")

    food_items = relationship("FoodItem", back_populates="owner")
    orders = relationship("Order", back_populates="user")
    carts = relationship("Cart", back_populates="user")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")

class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(100), nullable=False)  
    street = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    landmark = Column(String(255), nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="addresses")
    orders = relationship("Order", back_populates="delivery_address")

class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True)
    quantity = Column(Integer, default=0)
    price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    available = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="food_items")
    cart_items = relationship("CartItem", back_populates="food_item")
    order_items = relationship("OrderItem", back_populates="food_item")
    proteins = relationship("Protein", secondary="food_proteins", back_populates="food_items")


class Protein(Base):
    __tablename__ = "proteins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True)

    food_items = relationship("FoodItem", secondary="food_proteins", back_populates="proteins")
    cart_items = relationship("CartItem", back_populates="protein")
    order_items = relationship("OrderItem", back_populates="protein")


class Extra(Base):
    __tablename__ = "extras"

    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    price = Column(Float)

    cart_items = relationship("CartItem", secondary="cart_item_extras", back_populates="extras")
    order_items = relationship("OrderItem", secondary="order_item_extras", back_populates="extras")

class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="carts")
    cart_items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id", ondelete="CASCADE"))
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    protein_id = Column(Integer, ForeignKey("proteins.id"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    instructions = Column(Text, nullable=True)

    cart = relationship("Cart", back_populates="cart_items")
    food_item = relationship("FoodItem", back_populates="cart_items")
    protein = relationship("Protein", back_populates="cart_items")
    extras = relationship("Extra", secondary="cart_item_extras", back_populates="cart_items")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    delivery_address_id = Column(Integer, ForeignKey("addresses.id"), nullable=True)

    subtotal = Column(Float, nullable=False)
    delivery_fee = Column(Float, nullable=False)
    service_fee = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    total = Column(Float, nullable=False)

    special_instructions = Column(Text, nullable=True)
    payment_status = Column(String(20), default="unpaid") 
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    current_status = Column(SAEnum(OrderStatus), default=OrderStatus.PENDING)

    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order")
    delivery_address = relationship("Address", back_populates="orders")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    protein_id = Column(Integer, ForeignKey("proteins.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    instructions = Column(Text, nullable=True)

    order = relationship("Order", back_populates="order_items")
    food_item = relationship("FoodItem", back_populates="order_items")
    protein = relationship("Protein", back_populates="order_items")
    extras = relationship("Extra", secondary="order_item_extras", back_populates="order_items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    reference = Column(String(100), unique=True, nullable=False, index=True)
    amount = Column(Float, nullable=False)             
    amount_kobo = Column(Integer, nullable=False)      
    currency = Column(String(10), default="NGN")
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    gateway = Column(String(50), default="paystack")
    gateway_response = Column(Text, nullable=True)    
    channel = Column(String(50), nullable=True)        
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order", back_populates="payments")