from celery import Celery
from PIL import Image
from dotenv import load_dotenv
from database import SessionLocal, MediaTask
import boto3
import io
import os

load_dotenv()

celery_app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
REGION_NAME = os.getenv("AWS_REGION")

@celery_app.task
def process_image_task(task_id: str, filename: str):
    print(f"\n[Celery Worker] Thread running for job {task_id}")
    db = SessionLocal()
    
    try:
        # 1. Grab raw asset down from cloud storage memory channel
        s3_object = s3_client.get_object(Bucket=BUCKET_NAME, Key=filename)
        raw_data = s3_object["Body"].read()
        
        # 2. Execute computational matrix down-scaling
        img = Image.open(io.BytesIO(raw_data))
        max_width = 800
        if img.width > max_width:
            w_percent = (max_width / float(img.width))
            h_size = int((float(img.height) * float(w_percent)))
            img = img.resize((max_width, h_size), Image.Resampling.LANCZOS)
            
        # 3. Structural optimization compression
        output_buffer = io.BytesIO()
        img.convert("RGB").save(output_buffer, format="JPEG", quality=85)
        output_buffer.seek(0)
        
        # 4. Push optimized asset out to public bucket namespace
        optimized_filename = f"optimized_{filename}"
        s3_client.upload_fileobj(output_buffer, BUCKET_NAME, optimized_filename)
        
        # Construct global edge URL string
        public_url = f"https://{BUCKET_NAME}.s3.{REGION_NAME}.amazonaws.com/{optimized_filename}"
        
        # 5. Flush state transition down to database file
        task_record = db.query(MediaTask).filter(MediaTask.id == task_id).first()
        if task_record:
            task_record.status = "completed"
            task_record.optimized_url = public_url
            db.commit()
            
        print(f"[Celery Worker] Core lifecycle step success. Target synced.")
        
    except Exception as e:
        db.rollback()
        task_record = db.query(MediaTask).filter(MediaTask.id == task_id).first()
        if task_record:
            task_record.status = "failed"
            db.commit()
        print(f"[Celery Worker Exception]: {str(e)}")
    finally:
        db.close()