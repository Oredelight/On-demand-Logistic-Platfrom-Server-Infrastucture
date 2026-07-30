import logging
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database.models import FoodItem, Order, User, Protein, Extra
from database.schemas import OrderStatus, UserRole
from handlers.user import get_active_user

logger = logging.getLogger(__name__)


def require_admin(current_user: User = Depends(get_active_user)):
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def add_food_item(db: Session, name: str, description: str, price: float, owner_id: int = None, image_url: str = None):
    food_item = FoodItem(
        name=name,
        description=description,
        price=price,
        image_url=image_url,
        available=True,
        owner_id=owner_id
    )
    db.add(food_item)
    db.commit()
    db.refresh(food_item)
    return food_item


def add_protein(db: Session, name: str, price: float, owner_id: int = None):
    protein_item = Protein(name=name, price=price)
    db.add(protein_item)
    db.commit()
    db.refresh(protein_item)
    return protein_item


def add_extras(db: Session, name: str, price: float):
    extras_item = Extra(name=name, price=price)
    db.add(extras_item)
    db.commit()
    db.refresh(extras_item)
    return extras_item


def update_food_item(
    db: Session,
    food_item_id: int,
    name: str = None,
    description: str = None,
    price: float = None,
    available: bool = None,
    image_url: str = None
):
    food_item = db.query(FoodItem).filter_by(id=food_item_id).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")

    if name is not None:
        food_item.name = name
    if description is not None:
        food_item.description = description
    if price is not None:
        food_item.price = price
    if available is not None:
        food_item.available = available
    if image_url is not None:
        food_item.image_url = image_url

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
    return [_format_order(order) for order in orders]


def get_all_users(db: Session):
    return db.query(User).order_by(User.created_at.desc()).all()


def update_order_status(db: Session, order_id: int, new_status: str):
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.current_status.value

    try:
        status_enum = OrderStatus(new_status)
    except ValueError:
        valid = [s.value for s in OrderStatus]
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid values: {valid}")

    order.current_status = status_enum
    db.commit()
    db.refresh(order)

    # Send status update email to customer via Celery
    user = order.user
    if user and user.email:
        try:
            from workers.tasks import send_status_update_task
            send_status_update_task.delay(
                email=user.email,
                order_id=order.id,
                new_status=new_status
            )
        except Exception as e:
            logger.error(f"[ADMIN] Failed to dispatch status update email: {e}")

    logger.info(f"[ADMIN] Order #{order_id} status: {old_status} → {new_status}")
    return {
        "order_id": order.id,
        "old_status": old_status,
        "new_status": order.current_status.value,
    }


def _format_order(order: Order) -> dict:
    return {
        "order_id": order.id,
        "user_id": order.user_id,
        "user_email": order.user.email if order.user else None,
        "status": order.current_status.value,
        "payment_status": order.payment_status,
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "service_fee": order.service_fee,
        "tax": order.tax,
        "total": order.total,
        "instructions": order.special_instructions,
        "items": [
            {
                "food": item.food_item.name,
                "protein": item.protein.name if item.protein else None,
                "extras": [e.name for e in item.extras],
                "unit_price": item.unit_price,
                "quantity": item.quantity,
                "item_total": item.subtotal
            } for item in order.order_items
        ],
        "created_at": order.created_at,
    }
