import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pythonjsonlogger import jsonlogger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import settings
from database.db import Base, engine
from transport import routes


def setup_logging():
    logger = logging.getLogger()
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.handlers = [handler]
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)


setup_logging()
logger = logging.getLogger(__name__)


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.REDIS_URL,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    #Run on startup: create tables, log startup info.
    logger.info(f"[STARTUP] {settings.APP_NAME} starting in {settings.APP_ENV} mode")
    Base.metadata.create_all(bind=engine)
    logger.info("[STARTUP] Database tables verified/created")
    yield
    logger.info(f"[SHUTDOWN] {settings.APP_NAME} shutting down")



app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="On-demand food ordering platform — scalable, secure, and reliable.",
    version="2.0.0",
    docs_url="/docs" if settings.DEBUG else None,        
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.error(
        f"[ERROR] Unhandled exception on {request.method} {request.url.path}",
        exc_info=exc,
        extra={"request_id": request_id}
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please try again later.",
            "request_id": request_id,
        }
    )


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "environment": settings.APP_ENV,
    }


app.include_router(routes.router)

logger.info(f"[INIT] {settings.APP_NAME} API initialized with {len(app.routes)} routes")