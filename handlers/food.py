from sqlalchemy.orm import Session
from database.models import Extra, FoodItem, Cart, CartItem, OrderItem, Protein, Order, User
from fastapi import HTTPException
from database.schemas import OrderStatus

def fetch_food_items(db: Session):
    return db.query(FoodItem).all()

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

    food = db.query(FoodItem).filter_by(id=food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    base_price = food.price

    protein_price = 0
    protein = None

    if protein_id:
        protein = db.query(Protein).filter_by(id=protein_id).first()

        if not protein:
            raise HTTPException(status_code=404, detail="Protein not found")

        protein_price = protein.price

    extras_price = 0
    extras_objects = []

    if extras_ids:
        extras_objects = db.query(Extra).filter(Extra.id.in_(extras_ids)).all()

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
    return db.query(Protein).all()

def fetch_extras(db: Session):
    return db.query(Extra).all()

def clear_cart(db: Session, user_id: int):
    cart = db.query(Cart).filter_by(user_id=user_id).first()

    if not cart or not cart.cart_items:
        return {"message": "Cart is already empty"}
    db.query(CartItem).filter_by(cart_id=cart.id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Cart cleared successfully"}

def calculate_cart_subtotal(cart: Cart):
    subtotal = 0

    for item in cart.cart_items:
        subtotal += item.unit_price * item.quantity

    return subtotal

def place_order(db: Session, user: User, instructions: str = None):
    cart = db.query(Cart).filter_by(user_id=user.id, is_active=True).first()
    if not cart or not cart.cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    subtotal = sum(item.unit_price * item.quantity for item in cart.cart_items)

    delivery_fee = 500
    service_fee = subtotal * 0.05
    tax = subtotal * 0.075
    total = subtotal + delivery_fee + service_fee + tax

    order = Order(
        user_id=user.id,
        subtotal=subtotal,
        current_status=OrderStatus.PENDING,
        delivery_fee=delivery_fee,
        service_fee=service_fee,
        tax=tax,
        total=total,
        special_instructions=instructions
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    #Converting cart items to order items
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
        order_item.extras = item.extras
        db.add(order_item)

    db.commit()

    #Clear the cart after placing the order
    db.query(CartItem).filter_by(cart_id=cart.id).delete(synchronize_session=False)
    db.commit()

    return order

def get_order_by_id(db: Session, user_id: int, order_id: int):
    order = db.query(Order).filter_by(id=order_id, user_id=user_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "order_id": order.id,
        "status": order.current_status.value,
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
        "created_at": order.created_at
    }
