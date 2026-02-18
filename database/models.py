from utils.referral import generate_referral_code
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True)  
    hashed_password = Column(String)
    referral_code = Column(String, unique=True, index=True, default= generate_referral_code())
    referred_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)

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
    availability = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="food_items")
    carts = relationship("Cart", back_populates="food_item")
    orders = relationship("Order", back_populates="food_item")
    ratings = relationship("Rating", back_populates="food_item")

class Cart(Base):
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    quantity = Column(Integer)

    user = relationship("User", back_populates="carts")
    food_item = relationship("FoodItem", back_populates="carts")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    quantity = Column(Integer)
    total_price = Column(Integer)
    current_status = Column(String, default="pending")

    user = relationship("User", back_populates="orders")
    food_item = relationship("FoodItem", back_populates="orders")
    status_logs = relationship("OrderStatusLog", back_populates="order")

class OrderStatusLog(Base):
    __tablename__ = "order_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    old_status = Column(String)
    new_status = Column(String)
    timestamp = Column(String)

    order = relationship("Order", back_populates="status_logs")

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    rating = Column(Integer)
    comment = Column(String)

    user = relationship("User", back_populates="ratings")
    food_item = relationship("FoodItem", back_populates="ratings")
