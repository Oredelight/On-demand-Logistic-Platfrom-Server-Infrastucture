from celery import Celery
from config import settings

celery_app = Celery(
    "food_ordering",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["workers.tasks"],        # auto-discover tasks module
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="Africa/Lagos",
    enable_utc=True,

    # Reliability
    task_acks_late=True,              # ack only after task completes (prevents lost tasks)
    task_reject_on_worker_lost=True,  # re-queue on abrupt worker death
    worker_prefetch_multiplier=1,     # fair dispatch (important for slow email tasks)

    # Result expiry
    result_expires=3600,   

    # Retries
    task_max_retries=3,
    task_default_retry_delay=60,

    # Suppress Celery 6.0 deprecation warning
    broker_connection_retry_on_startup=True,
)