from datetime import datetime

from celery_app import celery_app
from database import SessionLocal
from db_models import MediaTask

from image_service import optimize_image
from s3_service import (
    download_file,
    upload_processed_file,
    get_public_url,
)
from logger import logger


@celery_app.task
def process_image_task(task_id: str, filename: str):

    logger.info(f"Started processing job {task_id}")

    db = SessionLocal()

    try:

        # Download original image from S3
        raw_bytes = download_file(filename)

        # Optimize image
        optimized_buffer, stats = optimize_image(raw_bytes)

        # Upload optimized image
        optimized_filename = f"optimized_{filename}"

        upload_processed_file(
            optimized_buffer,
            optimized_filename,
        )

        # Public URL
        public_url = get_public_url(
            optimized_filename
        )

        # Update database
        task = (
            db.query(MediaTask)
            .filter(MediaTask.id == task_id)
            .first()
        )

        if task:

            task.status = "COMPLETED"
            task.optimized_url = public_url

            task.original_size = stats["original_size"]
            task.optimized_size = stats["optimized_size"]
            task.processing_time_ms = stats["processing_time_ms"]
            task.compression_percentage = stats["compression_percentage"]

            task.completed_at = datetime.utcnow()

            db.commit()

        logger.info(
            f"Completed processing job {task_id}"
        )

    except Exception as e:

        db.rollback()

        task = (
            db.query(MediaTask)
            .filter(MediaTask.id == task_id)
            .first()
        )

        if task:
            task.status = "FAILED"
            task.error_message = str(e)
            db.commit()

        logger.error(
            f"Job {task_id} failed : {str(e)}"
        )

    finally:

        db.close()