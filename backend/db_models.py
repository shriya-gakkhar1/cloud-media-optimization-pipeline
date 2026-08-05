from sqlalchemy import Column, String, DateTime, Float
import datetime

from database import Base


class MediaTask(Base):

    __tablename__ = "media_tasks"

    id = Column(String, primary_key=True, index=True)

    original_filename = Column(String)

    stored_filename = Column(String)

    status = Column(String, default="PROCESSING")

    optimized_url = Column(String, nullable=True)

    original_size = Column(Float, nullable=True)

    optimized_size = Column(Float, nullable=True)

    compression_percentage = Column(Float, nullable=True)

    processing_time_ms = Column(Float, nullable=True)

    error_message = Column(String, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow
    )

    completed_at = Column(
        DateTime,
        nullable=True
    )