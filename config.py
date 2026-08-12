from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "DeliFoods"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # CORS / Frontend
    ALLOWED_ORIGINS: str = "*"
    FRONTEND_URL: str = "http://localhost:3001"

    # Database
    DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:password@localhost:5432/food_ordering_db"
    )

    # Authentication
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OTP
    OTP_TTL_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 5
    OTP_LOCKOUT_SECONDS: int = 900
    OTP_RESEND_WINDOW_SECONDS: int = 600
    OTP_RESEND_MAX: int = 3

    # Email
    EMAIL_PROVIDER: str = "smtp"
    FROM_EMAIL: str = "noreply@oredelight.com"
    FROM_NAME: str = "OreDelight"

    SENDGRID_API_KEY: Optional[str] = None

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True

    # Paystack
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_BASE_URL: str = "https://api.paystack.co"

    # Order pricing
    DELIVERY_FEE_NGN: float = 500.0
    SERVICE_FEE_PERCENT: float = 0.05
    TAX_PERCENT: float = 0.075

    # Rate limiting
    RATE_LIMIT_DEFAULT: str = "100/minute"

    @property
    def allowed_origins_list(self) -> list[str]:
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]

        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()