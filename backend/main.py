from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid

from database import init_db, SessionLocal
from db_models import MediaTask
from tasks import process_image_task
from s3_service import upload_file

app = FastAPI(
    title="MediaFlow API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/upload")
async def upload_raw_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Generate unique job ID
        job_id = str(uuid.uuid4())

        # Prevent filename collisions in S3
        stored_filename = f"{job_id}_{file.filename}"

        from config import settings

        print("Bucket:", settings.S3_BUCKET)
        print("Filename:", stored_filename)

        # Upload original image to S3
        upload_file(file.file, stored_filename)

        # Create database entry
        new_task = MediaTask(
            id=job_id,
            original_filename=file.filename,
            stored_filename=stored_filename,
            status="PROCESSING"
        )

        db.add(new_task)
        db.commit()

        # Trigger background worker
        process_image_task.delay(job_id, stored_filename)

        return {
            "success": True,
            "message": "Image uploaded successfully.",
            "data": {
                "task_id": job_id,
                "status": "PROCESSING"
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )


@app.get("/status/{task_id}")
def check_processing_status(
    task_id: str,
    db: Session = Depends(get_db)
):
    task = db.query(MediaTask).filter(MediaTask.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Processing task not found."
        )

    return {
        "success": True,
        "data": {
            "task_id": task.id,
            "status": task.status,
            "optimized_url": task.optimized_url
        }
    }