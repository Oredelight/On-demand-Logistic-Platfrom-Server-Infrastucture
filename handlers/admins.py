from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database.models import FoodItem, Order, User
from database.schemas import OrderStatus, UserRole
from handlers.user import get_current_user

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

def add_food_item(db: Session, item_name: str, description: str, price: float, owner_id: int = None):
    food_item = FoodItem(
        item_name=item_name,
        description=description,
        price=price,
        available=True,         
        owner_id=owner_id
    )
    db.add(food_item)
    db.commit()
    db.refresh(food_item)
    return food_item

def update_food_item(db: Session, food_item_id: int, item_name: str = None, description: str = None, price: float = None, available: bool = None):
    food_item = db.query(FoodItem).filter_by(id=food_item_id).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")

    if item_name is not None:
        food_item.item_name = item_name
    if description is not None:
        food_item.description = description
    if price is not None:
        food_item.price = price
    if available is not None:
        food_item.available = available

    db.commit()
    db.refresh(food_item)
    return food_item

def mark_food_item_availability(db: Session, food_item_id: int, available: bool):
    food_item = db.query(FoodItem).filter_by(id=food_item_id).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")

    food_item.available = available
    db.commit()
    db.refresh(food_item)
    return food_item

def get_all_orders(db: Session):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    result = []

    for order in orders:
        result.append({
            "order_id": order.id,
            "user_id": order.user_id,
            "status": order.current_status.value,
            "subtotal": order.subtotal,
            "delivery_fee": order.delivery_fee,
            "service_fee": order.service_fee,
            "tax": order.tax,
            "total": order.total,
            "instructions": order.instructions,
            "items": [
                {
                    "food": item.food.item_name,
                    "protein": item.protein.name if item.protein else None,
                    "extras": [e.name for e in item.extras],
                    "unit_price": item.unit_price,
                    "quantity": item.quantity,
                    "item_total": item.subtotal
                } for item in order.items
            ],
            "created_at": order.created_at
        })
    return result

def update_order_status(db: Session, order_id: int, new_status: str):
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.current_status.value

    try:
        status_enum = OrderStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid order status")

    order.current_status = status_enum
    db.commit()
    db.refresh(order)

    return {
        "order_id": order.id,
        "old_status": old_status,
        "new_status": order.current_status.value,
    }

