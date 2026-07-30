from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User
from database.schemas import (
    AddressCreate, AddressResponse,
    CartItemCreate, ExtrasCreate,
    FoodItemCreate, FoodItemUpdate,
    PaymentInitiateRequest,
    ProteinCreate,
    RefreshTokenRequest, ResendOTPRequest,
    Token, UpdateOrderStatusRequest,
    UserCreate, UserProfile, VerifyOTP,
)
from handlers.address import (
    add_address, delete_address, get_user_addresses, set_default_address
)
from handlers.admins import (
    add_extras, add_food_item, add_protein,
    get_all_orders, get_all_users,
    mark_food_item_availability, require_admin,
    update_food_item, update_order_status
)
from handlers.food import (
    clear_cart, fetch_extras, fetch_food_items,
    add_to_cart, fetch_proteins, get_cart,
    get_order_by_id, get_user_orders,
    place_order, remove_cart_item,
)
from handlers.payment import handle_webhook, initiate_payment, verify_payment
from handlers.user import (
    create_access_token, create_refresh_token, create_user,
    customer_only, get_active_user,
    get_user_by_email_or_phone,
    resend_otp, revoke_refresh_token, verify_password,
    verify_refresh_token, verify_user_email,
)

router = APIRouter()


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED, tags=["Auth"])
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email_or_phone(db, email=user.email, phone_number=user.phone_number)
    if existing:
        raise HTTPException(status_code=400, detail="Email or phone number already registered")

    create_user(db, user)
    return {
        "message": "Account created. An OTP has been sent to your email — please verify to activate your account."
    }


@router.post("/auth/verify", tags=["Auth"])
def verify_email(data: VerifyOTP, db: Session = Depends(get_db)):
    verify_user_email(db, email=data.email, otp=data.otp)
    return {"message": "Email verified successfully. You can now log in."}


@router.post("/auth/resend-otp", tags=["Auth"])
def resend_otp_endpoint(data: ResendOTPRequest, db: Session = Depends(get_db)):
    resend_otp(db, email=data.email)
    return {"message": "A new OTP has been sent to your email."}


@router.post("/auth/login", response_model=Token, tags=["Auth"])
def login(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing_user = get_user_by_email_or_phone(db, email=user.email)
    if not existing_user or not verify_password(user.password, existing_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not existing_user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account not verified. Please verify your email first."
        )

    access_token = create_access_token(data={"sub": existing_user.email, "role": existing_user.role})
    refresh_token = create_refresh_token(email=existing_user.email)

    if existing_user.email:
        try:
            from workers.tasks import send_login_notification_task
            ip = request.client.host if request.client else None
            login_time = datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")
            send_login_notification_task.delay(
                email=existing_user.email,
                login_time=login_time,
                ip_address=ip
            )
        except Exception:
            pass 

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": existing_user.role
    }


@router.post("/auth/refresh", tags=["Auth"])
def refresh_access_token(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    email = verify_refresh_token(body.refresh_token)
    user = get_user_by_email_or_phone(db, email=email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/logout", tags=["Auth"])
def logout(body: RefreshTokenRequest):
    revoke_refresh_token(body.refresh_token)
    return {"message": "Logged out successfully"}


@router.get("/users/me", response_model=UserProfile, tags=["Users"])
def get_my_profile(current_user: User = Depends(get_active_user)):
    return current_user


@router.get("/users/me/orders", tags=["Users"])
def get_my_orders(current_user: User = Depends(customer_only), db: Session = Depends(get_db)):
    return get_user_orders(db, user_id=current_user.id)


@router.post("/users/addresses", response_model=AddressResponse, status_code=201, tags=["Addresses"])
def add_delivery_address(
    data: AddressCreate,
    current_user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    return add_address(db, current_user, data)


@router.get("/users/addresses", response_model=list[AddressResponse], tags=["Addresses"])
def list_delivery_addresses(
    current_user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    return get_user_addresses(db, current_user)


@router.patch("/users/addresses/{address_id}/default", response_model=AddressResponse, tags=["Addresses"])
def set_default_delivery_address(
    address_id: int,
    current_user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    return set_default_address(db, current_user, address_id)


@router.delete("/users/addresses/{address_id}", tags=["Addresses"])
def remove_delivery_address(
    address_id: int,
    current_user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    return delete_address(db, current_user, address_id)


@router.get("/foods", tags=["Menu"])
def get_foods(db: Session = Depends(get_db)):
    return fetch_food_items(db)


@router.get("/proteins", tags=["Menu"])
def get_proteins(db: Session = Depends(get_db)):
    return fetch_proteins(db=db)


@router.get("/extras", tags=["Menu"])
def get_extras(db: Session = Depends(get_db)):
    return fetch_extras(db=db)



@router.get("/cart", tags=["Cart"])
def view_cart(user: User = Depends(customer_only), db: Session = Depends(get_db)):
    return get_cart(db=db, user_id=user.id)


@router.post("/cart/add", tags=["Cart"])
def add_to_cart_route(
    cart_item: CartItemCreate,
    user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    item = add_to_cart(
        db=db,
        user_id=user.id,
        food_id=cart_item.food_item_id,
        quantity=cart_item.quantity,
        protein_id=cart_item.protein_id,
        extras_ids=cart_item.extras_id,
        instructions=cart_item.instructions
    )
    return {
        "message": "Item added to cart",
        "cart_item_id": item.id,
        "food": item.food_item.name,
        "protein": item.protein.name if item.protein else None,
        "extras": [e.name for e in item.extras],
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "subtotal": item.subtotal
    }


@router.delete("/cart/items/{cart_item_id}", tags=["Cart"])
def remove_from_cart(
    cart_item_id: int,
    user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    return remove_cart_item(db=db, user_id=user.id, cart_item_id=cart_item_id)


@router.delete("/cart/clear", tags=["Cart"])
def clear_user_cart(user: User = Depends(customer_only), db: Session = Depends(get_db)):
    return clear_cart(db=db, user_id=user.id)


@router.post("/orders", tags=["Orders"])
def create_order(
    instructions: Optional[str] = None,
    delivery_address_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(customer_only)
):
    order = place_order(db, current_user, instructions, delivery_address_id)

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
        "next_step": "Call POST /payments/initiate to pay for this order"
    }


@router.get("/orders/{order_id}", tags=["Orders"])
def fetch_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(customer_only)
):
    return get_order_by_id(db, user_id=current_user.id, order_id=order_id)



@router.post("/payments/initiate", tags=["Payments"])
def initiate_payment_route(
    data: PaymentInitiateRequest,
    current_user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    return initiate_payment(db=db, order_id=data.order_id, user=current_user)


@router.get("/payments/{reference}/verify", tags=["Payments"])
def verify_payment_route(
    reference: str,
    current_user: User = Depends(customer_only),
    db: Session = Depends(get_db)
):
    return verify_payment(db=db, reference=reference, user=current_user)


@router.post("/payments/webhook", tags=["Payments"])
async def paystack_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_paystack_signature: str = Header(None)
):
    raw_body = await request.body()
    try:
        import json
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if not x_paystack_signature:
        raise HTTPException(status_code=400, detail="Missing Paystack signature header")

    return handle_webhook(
        db=db,
        payload=payload,
        raw_body=raw_body,
        signature=x_paystack_signature
    )


@router.post("/admin/foods", tags=["Admin"])
def route_add_food(
    food: FoodItemCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    food_item = add_food_item(
        db=db,
        name=food.name,
        description=food.description,
        price=food.price,
        image_url=food.image_url,
        owner_id=admin.id
    )
    return {"message": "Food item added", "food_id": food_item.id}


@router.post("/admin/proteins", tags=["Admin"])
def route_add_protein(
    protein: ProteinCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    p = add_protein(db=db, name=protein.name, price=protein.price, owner_id=admin.id)
    return {"message": "Protein added", "protein_id": p.id}


@router.post("/admin/extras", tags=["Admin"])
def route_add_extras(
    extras: ExtrasCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    e = add_extras(db=db, name=extras.name, price=extras.price)
    return {"message": "Extra added", "extra_id": e.id}


@router.put("/admin/foods/{food_id}", response_model=FoodItemUpdate, tags=["Admin"])
def route_update_food(
    food_id: int,
    food_update: FoodItemUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return update_food_item(
        db=db,
        food_item_id=food_id,
        name=food_update.name,
        description=food_update.description,
        price=food_update.price,
        available=food_update.available,
        image_url=food_update.image_url,
    )


@router.patch("/admin/foods/{food_id}/availability", tags=["Admin"])
def route_mark_availability(
    food_id: int,
    available: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    food = mark_food_item_availability(db=db, food_item_id=food_id, available=available)
    return {"food_id": food.id, "available": food.available}


@router.get("/admin/orders", tags=["Admin"])
def route_get_all_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return get_all_orders(db)


@router.patch("/admin/orders/{order_id}/status", tags=["Admin"])
def route_update_order_status(
    order_id: int,
    status_update: UpdateOrderStatusRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return update_order_status(db=db, order_id=order_id, new_status=status_update.new_status)


@router.get("/admin/users", tags=["Admin"])
def route_get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    users = get_all_users(db)
    return [
        {
            "id": u.id,
            "email": u.email,
            "phone_number": u.phone_number,
            "role": u.role,
            "is_active": u.is_active,
            "referral_code": u.referral_code,
            "created_at": u.created_at,
        }
        for u in users
    ]