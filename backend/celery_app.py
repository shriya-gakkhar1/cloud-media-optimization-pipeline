from celery import Celery
from config import settings

celery_app = Celery(
    "mediaflow",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Import task modules
celery_app.conf.imports = ("tasks",)