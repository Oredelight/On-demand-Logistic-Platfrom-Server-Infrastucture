from fastapi import FastAPI
from transport import routes

app = FastAPI()

app.include_router(routes.router)