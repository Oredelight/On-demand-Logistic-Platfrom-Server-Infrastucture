import logging
from sqlalchemy.orm import Session
from database.models import Extra, FoodItem, Cart, CartItem, OrderItem, Protein, Order, User
from fastapi import HTTPException
from database.schemas import OrderStatus
from config import settings

logger = logging.getLogger(__name__)


def fetch_food_items(db: Session):
    return db.query(FoodItem).filter_by(available=True).all()


def add_to_cart(
    db: Session,
    user_id: int,
    food_id: int,
    quantity: int,
    protein_id: int = None,
    extras_ids: list[int] = None,
    instructions: str = None
):
    cart = db.query(Cart).filter_by(user_id=user_id, is_active=True).first()

    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    food = db.query(FoodItem).filter_by(id=food_id, available=True).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found or unavailable")

    base_price = food.price
    protein_price = 0
    protein = None

    if protein_id:
        protein = db.query(Protein).filter_by(id=protein_id, is_available=True).first()
        if not protein:
            raise HTTPException(status_code=404, detail="Protein not found or unavailable")
        protein_price = protein.price

    extras_price = 0
    extras_objects = []

    if extras_ids:
        extras_objects = db.query(Extra).filter(Extra.id.in_(extras_ids)).all()
        if len(extras_objects) != len(extras_ids):
            raise HTTPException(status_code=404, detail="One or more extras not found")
        extras_price = sum(extra.price for extra in extras_objects)

    unit_price = base_price + protein_price + extras_price
    subtotal = unit_price * quantity

    cart_item = CartItem(
        cart_id=cart.id,
        food_item_id=food.id,
        protein_id=protein.id if protein else None,
        quantity=quantity,
        unit_price=unit_price,
        subtotal=subtotal,
        instructions=instructions
    )

    cart_item.extras = extras_objects

    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)

    return cart_item


def fetch_proteins(db: Session):
    return db.query(Protein).filter_by(is_available=True).all()


def fetch_extras(db: Session):
    return db.query(Extra).all()


def get_cart(db: Session, user_id: int):
    cart = db.query(Cart).filter_by(user_id=user_id, is_active=True).first()
    if not cart or not cart.cart_items:
        return {"items": [], "total_items": 0, "subtotal": 0}

    items = []
    subtotal = 0
    for item in cart.cart_items:
        item_data = {
            "cart_item_id": item.id,
            "food": item.food_item.name,
            "protein": item.protein.name if item.protein else None,
            "extras": [e.name for e in item.extras],
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "subtotal": item.subtotal,
            "instructions": item.instructions,
        }
        items.append(item_data)
        subtotal += item.subtotal

    return {
        "items": items,
        "total_items": len(items),
        "subtotal": subtotal,
        "delivery_fee": settings.DELIVERY_FEE_NGN,
        "estimated_total": subtotal + settings.DELIVERY_FEE_NGN,
    }


def clear_cart(db: Session, user_id: int):
    cart = db.query(Cart).filter_by(user_id=user_id).first()

    if not cart or not cart.cart_items:
        return {"message": "Cart is already empty"}

    db.query(CartItem).filter_by(cart_id=cart.id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Cart cleared successfully"}


def remove_cart_item(db: Session, user_id: int, cart_item_id: int):
    cart = db.query(Cart).filter_by(user_id=user_id, is_active=True).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    item = db.query(CartItem).filter_by(id=cart_item_id, cart_id=cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item removed from cart"}


def place_order(db: Session, user: User, instructions: str = None, delivery_address_id: int = None):
    cart = db.query(Cart).filter_by(user_id=user.id, is_active=True).first()
    if not cart or not cart.cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    subtotal = sum(item.unit_price * item.quantity for item in cart.cart_items)
    delivery_fee = settings.DELIVERY_FEE_NGN
    service_fee = subtotal * settings.SERVICE_FEE_PERCENT
    tax = subtotal * settings.TAX_PERCENT
    total = subtotal + delivery_fee + service_fee + tax

    order = Order(
        user_id=user.id,
        subtotal=subtotal,
        current_status=OrderStatus.PENDING,
        delivery_fee=delivery_fee,
        service_fee=service_fee,
        tax=tax,
        total=total,
        special_instructions=instructions,
        delivery_address_id=delivery_address_id,
        payment_status="unpaid",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Convert cart items → order items
    for item in cart.cart_items:
        order_item = OrderItem(
            order_id=order.id,
            food_item_id=item.food_item_id,
            protein_id=item.protein_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.subtotal,
            instructions=item.instructions
        )
        order_item.extras = list(item.extras)
        db.add(order_item)

    db.commit()

    # Clear the cart
    db.query(CartItem).filter_by(cart_id=cart.id).delete(synchronize_session=False)
    db.commit()
    db.refresh(order)

    # Build order summary for email
    order_data = {
        "order_id": order.id,
        "status": order.current_status.value,
        "items": [
            {
                "food": item.food_item.name,
                "protein": item.protein.name if item.protein else None,
                "extras": [e.name for e in item.extras],
                "quantity": item.quantity,
                "item_total": item.subtotal,
            } for item in order.order_items
        ],
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "service_fee": order.service_fee,
        "tax": order.tax,
        "total": order.total,
        "instructions": order.special_instructions,
    }

    # Send confirmation email via Celery
    if user.email:
        try:
            from utils.email import send_order_confirmation
            send_order_confirmation(to_email=user.email, order_data=order_data)
        except Exception as e:
            logger.error(f"[ORDER] Failed to dispatch order confirmation email: {e}")

    logger.info(f"[ORDER] Order #{order.id} placed by user={user.id} total=₦{total:.2f}")
    return order


def get_user_orders(db: Session, user_id: int):
    #Fetch all orders for a user (newest first)
    orders = db.query(Order).filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return [_format_order(order) for order in orders]


def get_order_by_id(db: Session, user_id: int, order_id: int):
    order = db.query(Order).filter_by(id=order_id, user_id=user_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _format_order(order)


def _format_order(order: Order) -> dict:
    return {
        "order_id": order.id,
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
