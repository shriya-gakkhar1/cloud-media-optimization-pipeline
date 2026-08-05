import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = "MediaFlow"
    APP_VERSION = "1.0.0"

    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
    AWS_REGION = os.getenv("AWS_REGION")
    S3_BUCKET = os.getenv("S3_BUCKET")

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "sqlite:///./mediaflow.db"
    )

    REDIS_URL = os.getenv(
        "REDIS_URL",
        "redis://localhost:6379/0"
    )

settings = Settings()