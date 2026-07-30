from logging.config import fileConfig

from sqlalchemy import create_engine, pool
from alembic import context
from database.db import Base
from database.models import (
    User, FoodItem, Cart, Order, Protein, Extra,
    CartItem, OrderItem, Address, Payment,
    food_proteins, cart_item_extras, order_item_extras
)
from config import settings

# Alembic Config object
config = context.config

# Set the DB URL from our settings (overrides alembic.ini)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Set up Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no DB connection needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        render_as_batch=True,           # needed for SQLite ALTER TABLE support
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,              # detect column type changes
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connects to the DB)."""
    # Build engine from settings (supports both PostgreSQL and SQLite)
    connect_args = {}
    if "sqlite" in settings.DATABASE_URL:
        connect_args = {"check_same_thread": False}

    connectable = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        poolclass=pool.NullPool,        # use NullPool for migration runs
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
