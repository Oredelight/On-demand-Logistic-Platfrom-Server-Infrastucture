# Food Ordering App

A FastAPI‑based backend for a simple food ordering system.  
Supports customer and admin roles, shopping cart, orders, referral codes, and email OTP verification.

---

## Features

- **User accounts**
  - Sign up with email or phone
  - Email verification via OTP stored in Redis
  - JWT authentication (role included)

- **Customer**
  - Browse food items
  - Add to cart with proteins & extras
  - View / clear cart
  - Place orders (auto fees & tax)
  - Track own orders

- **Admin**
  - Add/update food items
  - Toggle availability
  - View all orders
  - Change order status

- **Referral system**
  - 8‑character UUID code generated for each user
  - Link referral on signup

---

## Project Structure

```
.
├── main.py
├── requirements.txt
├── database/
│   ├── db.py
│   ├── models.py
│   └── schemas.py
├── handlers/
│   ├── admins.py
│   ├── food.py
│   └── user.py
├── transport/
│   └── routes.py
└── utils/
    └── referral.py
```

- `database/` contains SQLAlchemy models, Pydantic schemas, and DB setup.
- `handlers/` holds business logic for users, food/cart, and admin operations.
- `transport/routes.py` defines FastAPI endpoints.
- `utils/referral.py` generates referral codes.
- `main.py` creates the FastAPI app and includes routes.

---

## 🛠️ Installation

```bash
git clone <repo-url>
cd food-ordering-app

python -m venv venv
source venv/bin/activate      

pip install -r requirements.txt
```

Make sure a Redis server is running on `localhost:6379`:

```bash
redis-server
```

---

## 🚀 Running

```bash
uvicorn main:app --reload
```

API docs available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Configuration

- **Database**: SQLite by default (`food_ordering_app.db`).  
  Change `SQLALCHEMY_DATABASE_URL` in [`database/db.py`](database/db.py).

- **JWT**:  
  - `SECRET_KEY` in [`handlers/user.py`](handlers/user.py) – **change for production**.  
  - `ACCESS_TOKEN_EXPIRE_MINUTES` default 60.

- **Redis**: host/port in `handlers/user.py`.  
  `OTP_TTL` is 300 seconds.

> Recommended🫠: use `.env` and `python-dotenv` for sensitive values.

---

## Dependencies

See [`requirements.txt`](requirements.txt); key packages:

- `fastapi`, `uvicorn`
- `sqlalchemy`
- `passlib[bcrypt]`
- `python-jose`
- `redis`
- `pydantic`, `email-validator`

---

## Database Schema (key tables)

- **users** – credentials, role, referral codes
- **food_items** – catalogue
- **carts / cart_items** – current user cart
- **orders / order_items / order_status_logs**
- **proteins / extras** – optional add‑ons

---

## API Endpoints

### Authentication

| Verb | Path            | Description                  |
|------|-----------------|------------------------------|
| POST | `/signup`       | Register new user            |
| POST | `/verify`       | Verify email OTP             |
| POST | `/login`        | Obtain JWT token             |

### Customer

| Verb | Path                    | Auth | Description                    |
|------|-------------------------|------|--------------------------------|
| GET  | `/foods`                | none | List available items           |
| POST | `/cart/add`             | yes  | Add item to cart              |
| DELETE| `/cart/clear`          | yes  | Empty cart                    |
| POST | `/orders`               | yes  | Place order                   |
| GET  | `/orders/{order_id}`    | yes  | Fetch own order details       |

### Admin (require `role=admin` token)

| Verb | Path                        | Description                   |
|------|-----------------------------|-------------------------------|
| POST | `/admin/foods`              | Add food item                 |
| PUT  | `/admin/foods/{food_id}`    | Update food item              |
| PATCH| `/admin/foods/{food_id}/availability` | Toggle availability |
| GET  | `/admin/orders`             | List all orders               |
| PATCH| `/admin/orders/{order_id}/status` | Change order status   |

> All protected endpoints expect:
> `Authorization: Bearer <JWT>`

---

## Validation Rules

- **Email/Phone**: one required; phone must match `^\+?[1-9]\d{7,14}$`.
- **Password**: 8–72 chars.
- **Referral code**: validated at signup.
- **Order status**: one of `Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`.

---

## Future Enhancements

- Payment gateway, notifications (email/SMS)
- Ratings/reviews, order history
- Admin analytics, real‑time updates
- Security & performance improvements

---

## Notes & Troubleshooting

- OTP printed to console for dev.
- Delete `food_ordering_app.db` to reset DB.
- Redis connection errors → start server.
- `SECRET_KEY` must be changed for production.

---
Enjoy building with the Food Ordering App!
