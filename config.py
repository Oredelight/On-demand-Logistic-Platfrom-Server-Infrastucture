from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    APP_NAME: str = "DeliFoods"
    APP_ENV: str = "development"       # development | production
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "*"         # comma-separated list for production
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/food_ordering_db"
    SECRET_KEY: str = "ILOVEJENNIEKIMFROMBLACKPINK"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REDIS_URL: str = "redis://localhost:6379/0"
    OTP_TTL_SECONDS: int = 300           # 5 minutes
    OTP_MAX_ATTEMPTS: int = 5            # lock after 5 wrong tries
    OTP_LOCKOUT_SECONDS: int = 900       # 15-minute lockout
    OTP_RESEND_WINDOW_SECONDS: int = 600 # 10-minute window
    OTP_RESEND_MAX: int = 3              # max resends per window
    EMAIL_PROVIDER: str = "smtp"         # smtp | sendgrid
    FROM_EMAIL: str = "noreply@oredelight.com"
    FROM_NAME: str = "OreDelight"
    SENDGRID_API_KEY: Optional[str] = None
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = "[EMAIL_ADDRESS]"
    SMTP_PASSWORD: Optional[str] = "vuwoisxhqwwcsrpf"
    SMTP_USE_TLS: bool = True
    PAYSTACK_SECRET_KEY: str = "sk_test_9f5fd0b41b59315af687f20463ad2fd16950e564"
    PAYSTACK_PUBLIC_KEY: str = "pk_test_01b78c8bff2e73a253a785fc74d0cfa79aee06eb"
    PAYSTACK_BASE_URL: str = "https://api.paystack.co"
    FRONTEND_URL: str = "http://localhost:3001"
    DELIVERY_FEE_NGN: float = 500.0
    SERVICE_FEE_PERCENT: float = 0.05   # 5%
    TAX_PERCENT: float = 0.075          # 7.5%
    RATE_LIMIT_DEFAULT: str = "100/minute"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
