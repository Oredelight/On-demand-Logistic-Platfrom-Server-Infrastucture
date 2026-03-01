# Food Ordering App

A FastAPI‑based backend powering a food‑ordering service. It supports multiple user roles, a configurable menu, shopping carts, order lifecycle management, referral codes, optional proteins/extras and email OTP verification. The project ships with a simple data‑migration mechanism to keep the SQLite schema in sync as new fields and tables are added.

---

## Table of Contents

1. [Features](#features)  
2. [Project structure](#project-structure)  
3. [Tech stack](#tech-stack)  
4. [Installation & setup](#installation--setup)  
5. [Configuration](#configuration)  
6. [Running & documentation](#running--documentation)  
7. [Database schema & migrations](#database-schema--migrations)  
8. [Authentication & authorization](#authentication--authorization)  
9. [API reference](#api-reference)  
10. [Validation rules](#validation-rules)  
11. [Troubleshooting](#troubleshooting)  
12. [Future enhancements](#future-enhancements)  
13. [License](#license)

---

## Features

### User management

- Register with **email** or **phone number** (one is required).
- Email verification via one‑time password (OTP); codes stored in Redis.
- JWT login with `role` claim (`customer` or `admin`).
- Referral codes – each user gets an 8‑character UUID code; new users may
  supply a referrer.

### Customer‑side functionality

- Browse **available food items**.
- Browse optional **proteins** and **extras**.
- Add items to a **cart** with customizable proteins, extras and instructions.
- View and clear the cart.
- Place orders; subtotal, delivery fee, service fee and tax calculated
  automatically.
- Track order status and view order details.

### Administration

- Create/update/delete food items.
- Add new proteins and extras.
- Toggle item availability.
- View all orders with full line‑item details.
- Update order status (`Pending`, `Processing`, `Shipped`, `Delivered`,
  `Cancelled`).
- Admin routes are protected; a valid JWT with `role == "admin"` is required.

### Miscellaneous

- Built‑in data migration tool (Alembic‑style scripts) keeps SQLite schema
  up to date.
- Detailed Pydantic schemas for automated request validation.
- OTP TTL and JWT expiry configurable.
- Referral system stored via `referred_by_user_id`.

---

## Project structure

```
food-ordering-app/
├── main.py                    # application entry point
├── requirements.txt           # pip dependencies
├── README.MD                  # this file
├── database/
│   ├── db.py                  # engine, session and migration helper
│   ├── models.py              # SQLAlchemy ORM models
│   ├── schemas.py             # request/response Pydantic models
│   └── migrations/            # SQL migration scripts (versioned)
├── handlers/
│   ├── user.py                # signup/login/verification/business logic
│   ├── food.py                # cart, order and menu logic
│   └── admins.py              # admin‑only operations
├── transport/
│   └── routes.py              # FastAPI router definitions
└── utils/
    ├── referral.py            # referral code generator
    └── migrate.py             # helper to run migrations (optional)
```

---

## Tech Stack

- **Framework:** FastAPI  
- **Database:** SQLite (default); SQLAlchemy ORM  
- **Authentication:** JWT via `python-jose`  
- **Password hashing:** Bcrypt (`passlib`)  
- **OTP storage:** Redis  
- **Validation:** Pydantic  
- **Migrations:** lightweight script / Alembic  
- **Server:** Uvicorn  

---

## Installation & setup

```bash
git clone <repository-url>
cd food-ordering-app

# create/activate venv
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Start Redis (required for OTPs):

```bash
redis-server
```

Create/upgrade the database schema:

```bash
# simple helper included
python database/migrate.py

# or, if using alembic
alembic upgrade head
```

> The migration script reads SQL files in `database/migrations/` and applies
> any that have not yet run.  Add a new file there whenever you alter models.

---

## Configuration

Most configurable values live in `handlers/user.py` and `database/db.py`.
It is **strongly recommended** to load these from environment variables
(via `python-dotenv`).

| Setting                          | Location           | Default           | Notes                           |
|----------------------------------|--------------------|-------------------|---------------------------------|
| `SECRET_KEY`                     | `handlers/user.py` | `"YOUDONTKNOW..."`| change before production        |
| `ALGORITHM`                      | `handlers/user.py` | `"HS256"`         |                                 |
| `ACCESS_TOKEN_EXPIRE_MINUTES`    | `handlers/user.py` | `60`              |                                 |
| `OTP_TTL`                        | `handlers/user.py` | `300` (5 min)     | Redis key expiry                |
| `SQLALCHEMY_DATABASE_URL`        | `database/db.py`   | `sqlite:///./food_ordering_app.db` | swap for other RDBMS |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` | `handlers/user.py` | `localhost,6379,0` |                       |

---

## Running & documentation

```bash
uvicorn main:app --reload
```

Visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Endpoints are documented automatically using the Pydantic schemas.

---

## Database schema & migrations

The application’s models are defined in `database/models.py`.  When you add or
change a table/column you must also add a migration script under
`database/migrations/` and run the migration helper before running the
application.

### Key tables

- **users**: id, email, phone_number, hashed_password, role,
  referral_code, referred_by_user_id, is_active
- **food_items**: id, item_name, description, price, quantity, available,
  owner_id
- **proteins**: id, name, price, is_available
- **extras**: id, name, price
- **carts / cart_items**
- **orders / order_items / order_status_logs**

Association (many‑to‑many) tables:

- `food_proteins`, `cart_item_extras`, `order_item_extras`

The helper script either issues `CREATE TABLE IF NOT EXISTS` statements or
runs Alembic migrations; refer to its header comments for usage.

---

## Authentication & authorization

The app uses OAuth2 password flow with bearer tokens.  Token payload:

```json
{
  "sub": "<user email>",
  "role": "customer" | "admin"
}
```

`customer_only` and `require_admin` dependencies in `handlers/user.py`
validate the token and, for `require_admin`, verify that `role == "admin"`.

---

## API reference

### Authentication

| Verb | Path      | Description                          |
|------|-----------|--------------------------------------|
| POST | `/signup` | Register new user (email/phone/pass) |
| POST | `/verify` | Verify email with OTP                |
| POST | `/login`  | Obtain JWT token                     |

### Public customer endpoints

| Verb | Path                      | Auth | Description                               |
|------|---------------------------|------|-------------------------------------------|
| GET  | `/foods`                  | none | List available food items                 |
| GET  | `/proteins`               | none | List available proteins                   |
| GET  | `/extras`                 | none | List available extras                     |

### Authenticated customer endpoints

| Verb | Path                    | Description                            |
|------|-------------------------|----------------------------------------|
| POST | `/cart/add`             | Add item to cart                       |
| DELETE| `/cart/clear`          | Clear current user’s cart              |
| POST | `/orders`               | Place order from cart (query param `instructions` optional) |
| GET  | `/orders/{order_id}`    | Retrieve own order details             |

### Admin endpoints (`role=admin`)

| Verb | Path                                    | Description                        |
|------|-----------------------------------------|------------------------------------|
| POST | `/admin/foods`                          | Create food item                   |
| PUT  | `/admin/foods/{food_id}`                | Update food item                   |
| PATCH| `/admin/foods/{food_id}/availability`   | Toggle availability                |
| POST | `/admin/proteins`                       | Add protein option                 |
| POST | `/admin/extras`                         | Add extra option                   |
| GET  | `/admin/orders`                         | List all orders                    |
| PATCH| `/admin/orders/{order_id}/status`       | Update order status                |

**Headers:**  
`Authorization: Bearer <JWT>`  
If missing/invalid you receive `401`; if role insufficient you’ll get `403`.

---

## Validation rules

- Email must be valid format; phone must match `^\+?[1-9]\d{7,14}$`.
- Password 8–72 characters.
- Referral code, if provided, must belong to an existing user.
- Order status updates accept only the predefined enum values.

Invalid input returns `400` with field‑specific messages generated by
Pydantic and the handlers.

---

## Troubleshooting

- **Redis not running:** `ConnectionError` → start `redis-server`.
- **DB locked:** close other connections, delete `food_ordering_app.db`.
- **Missing migrations:** run `python database/migrate.py`.
- **OTP not received:** check Redis connection; in development the code is
  logged to console.
- **JWT errors:** ensure `SECRET_KEY` is set and consistent between runs.

---

## Future enhancements

- Payment gateway (Stripe/PayPal)
- Email/SMS notifications
- Ratings/reviews, order history, re‑order functionality
- Admin analytics dashboard
- Real‑time tracking (WebSockets)
- Internationalization and push notifications
- Security improvements (HTTPS, CORS, rate limiting, audit logs)

---

_Last updated: March 1st 2026 (v1.1.0)_
