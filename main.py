from fastapi import FastAPI
from database.db import engine, Base
from database.models import User, FoodItem, Cart, Order
from transport import routes

app = FastAPI()

app.include_router(routes.router)