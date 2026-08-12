# DeliFoods Food Ordering App

DeliFoods is a full-stack food ordering platform with a FastAPI backend, a React/Vite frontend, JWT-based authentication, cart and order management, Paystack payments, and admin controls. The project is designed for local development first, with support for Redis-backed OTP flows, background email jobs, and a multi-role user experience.

Check it out here: https://delifoods-frontend.onrender.com

## Overview

This application allows customers to:

- browse available food items
- customize meals with proteins, extras, and special instructions
- manage a cart and place orders
- view order history and payment status
- receive order and authentication-related email notifications

It also gives admins the ability to:

- manage food items and availability
- add proteins and extras
- review all orders
- update order status
- create admin accounts

## Core Features

- User registration with email or phone number
- Email OTP verification with Redis-backed storage and rate limiting
- JWT authentication with customer and admin roles
- Referral code support at signup
- Menu browsing with optional proteins and extras
- Cart management with per-item customization
- Checkout and order creation with pricing breakdowns
- Paystack payment initiation and webhook verification
- Delivery address management
- Admin dashboard actions for inventory and orders
- Background email delivery via Celery

## Tech Stack

### Backend
- Python 3.10+
- FastAPI
- SQLAlchemy
- Pydantic v2
- PostgreSQL by default, with SQLite support for local development
- Redis for OTPs and refresh tokens
- JWT via python-jose
- Passlib + bcrypt for password hashing
- Celery for background email tasks
- Paystack integration

### Frontend
- React
- Vite
- Zustand for state management
- React Router
- Axios
- Framer Motion and lucide-react

## Project Structure

```text
food-ordering-app/
├── main.py                  # FastAPI app entry point
├── config.py                # application settings
├── requirements.txt         # Python dependencies
├── create_admin.py           # seed an admin user
├── database/
│   ├── db.py                # SQLAlchemy engine/session setup
│   ├── models.py            # ORM models
│   └── schemas.py           # request/response schemas
├── handlers/
│   ├── admins.py           # admin-only business logic
│   ├── food.py             # menu/cart/order business logic
│   ├── payment.py          # Paystack payment flow
│   └── user.py             # auth, token, and OTP logic
├── transport/
│   └── routes.py           # API routes
├── utils/
│   ├── email.py            # transactional email helpers
│   └── referral.py         # referral code generation
├── workers/
│   ├── celery_app.py       # Celery application config
│   └── tasks.py            # async email tasks
└── frontend/
    ├── src/
    └── package.json
```

## Prerequisites

Before running the app, make sure you have:

- Python 3.10 or newer
- Node.js 18 or newer
- Redis running locally
- Optional: PostgreSQL if you want to use the default database configuration


## Backend Setup

1. Create and activate a virtual environment:

```bash
python -m venv venv
venv\Scripts\activate
```

2. Install backend dependencies:

```bash
pip install -r requirements.txt
```

3. Ensure Redis is running:

```bash
redis-server
```

4. Start the API server:

```bash
uvicorn main:app --reload
```

The backend will be available at:

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Frontend Setup

1. Install frontend dependencies:

```bash
cd frontend
npm install
```

2. Start the Vite development server:

```bash
npm run dev
```

The frontend will usually open at:

- http://localhost:3000

## Creating an Admin Account

Seed an admin account with:

```bash
python create_admin.py
```

The script will prompt for an email and password and create or upgrade an admin user.

## Running Background Tasks

Email delivery is handled through Celery. In a separate terminal, start the worker:

```bash
celery -A workers.celery_app worker --loglevel=info
```

This is required for OTPs, order confirmations, status updates, and other asynchronous email tasks.

## API Overview

### Authentication

- POST /auth/signup — create an account and request OTP verification
- POST /auth/verify — verify email with OTP
- POST /auth/resend-otp — resend OTP
- POST /auth/login — obtain access and refresh tokens
- POST /auth/refresh — refresh an access token
- POST /auth/logout — revoke a refresh token

### Customer Routes

- GET /foods — list available food items
- GET /proteins — list available proteins
- GET /extras — list available extras
- GET /cart — view current cart
- POST /cart/add — add an item to the cart
- DELETE /cart/items/{cart_item_id} — remove one cart item
- DELETE /cart/clear — clear the cart
- POST /orders — create an order from the current cart
- GET /orders/{order_id} — fetch one order
- GET /users/me — fetch current user profile
- GET /users/me/orders — fetch user order history
- POST /payments/initiate — start a Paystack payment
- GET /payments/{reference}/verify — verify a payment

### Admin Routes

- POST /admin/foods — create a food item
- PUT /admin/foods/{food_id} — update a food item
- PATCH /admin/foods/{food_id}/availability — toggle availability
- POST /admin/proteins — create a protein option
- POST /admin/extras — create an extra option
- GET /admin/orders — list all orders
- PATCH /admin/orders/{order_id}/status — update an order status
- GET /admin/users — list users


## Troubleshooting

- Redis connection errors: make sure Redis is running and the REDIS_URL is correct
- Authentication errors: confirm the token is included as a Bearer token and that your secret key is consistent
- OTP failures: check Redis and the email worker logs
- Database issues: verify the DATABASE_URL and ensure the database service is reachable
- Frontend API errors: confirm the frontend is pointing to the backend URL on port 8000

