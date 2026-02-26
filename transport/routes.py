from fastapi import APIRouter, Depends, HTTPException, status, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User
from database.schemas import User, CartItemCreate, FoodItemCreate, FoodItemUpdate, UpdateOrderStatusRequest, UserCreate, VerifyOTP, Token, OrderStatus
from handlers.admins import add_food_item, get_all_orders, mark_food_item_availability, require_admin, update_food_item, update_order_status
from handlers.food import clear_cart, fetch_food_items, add_to_cart, get_order_by_id, place_order
from handlers.user import create_access_token, create_user, get_user_by_email_or_phone, verify_password, verify_user_email, customer_only

router = APIRouter()

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email_or_phone(db, email=user.email, phone_number=user.phone_number)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or phone number already exists")
    
    create_user(db, user)
    return {"message": "User created successfully. Please verify your email with the OTP sent."}

@router.post("/verify")
def verify_email(data: VerifyOTP, db: Session = Depends(get_db)):
    verify_user_email(db, email=data.email, otp=data.otp)
    return {"message": "Email verified successfully"}

@router.post("/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email_or_phone(db, email=user.email)
    if not existing_user or not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(status_code=404, detail="User not found or incorrect password")
    
    access_token = create_access_token(data={"sub": existing_user.email, "role": existing_user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": existing_user.role}

@router.get("/foods")
def get_foods(db: Session = Depends(get_db)):
    return fetch_food_items(db)

@router.post("/cart/add")
def add_cart(cart_item: CartItemCreate, user: User = Depends(customer_only),db: Session = Depends(get_db)):
    item = add_to_cart(
        db=db,
        user_id=user.id,
        food_id=cart_item.food_item_id,
        quantity=cart_item.quantity,
        protein_id=cart_item.protein_id,
        extras_ids=cart_item.extras_ids,
        instructions=cart_item.instructions
    )
    return {
        "message": "Item added to cart",
        "cart_item_id": item.id,
        "food": item.food.name,
        "protein": item.protein.name if item.protein else None,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "subtotal": item.subtotal
    }

@router.delete("/cart/clear")
def clear_user_cart(user: User = Depends(customer_only), db: Session = Depends(get_db)):
    return clear_cart(db=db, user_id=user.id)

@router.post("/orders")
def create_order(
    instructions: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(customer_only)
):
    order = place_order(db, current_user, instructions)

    return {
        "order_id": order.id,
        "status": order.current_status.value,
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "service_fee": order.service_fee,
        "tax": order.tax,
        "total": order.total,
        "instructions": order.instructions,
        "items": [
            {
                "food": item.food.name,
                "protein": item.protein.name if item.protein else None,
                "extras": [e.name for e in item.extras],
                "unit_price": item.unit_price,
                "quantity": item.quantity,
                "item_total": item.subtotal
            } for item in order.items
        ],
        "created_at": order.created_at
    }

@router.get("/orders/{order_id}")
def fetch_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(customer_only)):
    return get_order_by_id(db, user_id=current_user.id, order_id=order_id)

@router.post("/admin/foods")
def route_add_food(food: FoodItemCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    food_item = add_food_item(
        db=db,
        item_name=food.item_name,
        description=food.description,
        price=food.price,
        owner_id=admin.id
    )
    return {"message": "Food item added", "food_id": food_item.id}

@router.put("/admin/foods/{food_id}")
def route_update_food(food_id: int, food_update: FoodItemUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    food_item = update_food_item(
        db=db,
        food_item_id=food_id,
        item_name=food_update.item_name,
        description=food_update.description,
        price=food_update.price,
        available=food_update.available
    )
    return {"message": "Food item updated", "food": food_item}

@router.patch("/admin/foods/{food_id}/availability")
def route_mark_availability(food_id: int, available: bool, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    food_item = mark_food_item_availability(db=db, food_item_id=food_id, available=available)
    return {"message": f"Food item {'available' if available else 'unavailable'}", "food": food_item}

@router.get("/admin/orders")
def route_get_all_orders(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    orders = get_all_orders(db)
    return orders

@router.patch("/admin/orders/{order_id}/status")
def route_update_order_status(order_id: int, status_update: UpdateOrderStatusRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    result = update_order_status(db=db, order_id=order_id, new_status=status_update.new_status)
    return result