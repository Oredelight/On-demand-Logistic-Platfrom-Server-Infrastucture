from sqlalchemy.orm import Session
from database.models import FoodItem, Cart, CartItem, Order, OrderStatusLog, Rating
from database.schemas import FoodItem, CartItemCreate, OrderCreate, Order, OrderStatusLogCreate, OrderStatusLog, RatingCreate, RatingCreate
from fastapi import HTTPException, status, Depends

def fetch_food_items(db: Session):
    return db.query(FoodItem).all()

def add_to_cart(
    db: Session,
    user_id: int,
    food_id: int,
    quantity: int,
    protein: str = None,
    extras: str = None,
    instructions: str = None
):
    cart = db.query(Cart).filter_by(user_id=user_id).first()

    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    cart_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.food_item_id == food_id,
        CartItem.protein == protein,
        CartItem.extras == extras,
        CartItem.instructions == instructions
    ).first()

    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            food_item_id=food_id,
            quantity=quantity,
            protein=protein,
            extras=extras,
            instructions=instructions
        )
        db.add(cart_item)

    db.commit()
    db.refresh(cart_item)
    return cart_item
