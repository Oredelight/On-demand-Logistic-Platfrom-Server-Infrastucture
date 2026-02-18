from fastapi import FastAPI
from database.db import engine, Base
from database.models import User, FoodItem, Cart, Order, OrderStatusLog
from transport import routes

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(routes.router)