from datetime import datetime
from utils.referral import generate_referral_code
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Float, Table
from sqlalchemy.orm import relationship
from database.db import Base
from database.schemas import OrderStatus, UserRole

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True)  
    hashed_password = Column(String)
    role = Column(String, default= UserRole.CUSTOMER.value)
    referral_code = Column(String, unique=True, index=True, default= generate_referral_code())
    referred_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=False)

    referred_by = relationship("User", remote_side=[id], backref="referrals")

    food_items = relationship("FoodItem", back_populates="owner")
    orders = relationship("Order", back_populates="user")
    carts = relationship("Cart", back_populates="user")
    ratings = relationship("Rating", back_populates="user")

class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True)
    quantity = Column(Integer)
    price = Column(Integer)
    available = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="food_items")
    carts = relationship("Cart", back_populates="food_item")
    orders = relationship("Order", back_populates="food_item")
    ratings = relationship("Rating", back_populates="food_item")
    cart_items = relationship("CartItem", back_populates="food_item")
    proteins = relationship("Protein", secondary="food_proteins", back_populates="foods")
    orders = relationship("Order", back_populates="food_item")

class Protein(Base):
    __tablename__ = "proteins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True)

    foods_items = relationship("FoodItem", secondary="food_proteins", back_populates="proteins")
    cart_items = relationship("CartItem", back_populates="protein")
    order_items = relationship("OrderItem", back_populates="protein")

food_proteins = Table("food_proteins",Base.metadata,
    Column("food_id", Integer, ForeignKey("food_items.id")),
    Column("protein_id", Integer, ForeignKey("proteins.id"))
)

class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    quantity = Column(Integer)

    user = relationship("User", back_populates="carts")
    food_item = relationship("FoodItem", back_populates="carts")
    cart_items = relationship("CartItem", back_populates="cart")

class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"))
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    quantity = Column(Integer, nullable=False, default=1)
    protein_id = Column(Integer, ForeignKey("proteins.id"), nullable=True)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False) 
    instructions = Column(String, nullable=True)

    cart = relationship("Cart", back_populates="cart_items")
    food_item = relationship("FoodItem", back_populates="cart_items")
    protein = relationship("Protein")
    extras = relationship("Extra",secondary="cart_item_extras", back_populates="cart_items")

class Extra(Base):
    __tablename__ = "extras"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    price = Column(Float)

    cart_items = relationship("CartItem", secondary="cart_item_extras", back_populates="extras")
    order_items = relationship("OrderItem", back_populates="extras")

cart_item_extras = Table("cart_item_extras", Base.metadata,
    Column("cart_item_id", Integer, ForeignKey("cart_items.id")),
    Column("extra_id", Integer, ForeignKey("extras.id"))
)

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subtotal = Column(Float)
    delivery_fee = Column(Float)
    service_fee = Column(Float)
    tax = Column(Float)
    total = Column(Float)
    special_instructions = Column(String, nullable=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    current_status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)

    user = relationship("User", back_populates="orders")
    food_item = relationship("FoodItem", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    food_id = Column(Integer, ForeignKey("food_items.id"))
    protein_id = Column(Integer, ForeignKey("proteins.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    instructions = Column(String, nullable=True)

    order = relationship("Order", back_populates="items")
    food_item = relationship("FoodItem")
    protein = relationship("Protein")
    extras = relationship("Extra", secondary="order_item_extras", back_populates="order_items")

order_item_extras = Table("order_item_extras", Base.metadata,
    Column("order_item_id", Integer, ForeignKey("order_items.id")),
    Column("extra_id", Integer, ForeignKey("extras.id"))
)