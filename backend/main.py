from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, SessionLocal, MediaTask
from tasks import process_image_task
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import boto3
import uuid
import os

# Securely load environment variables from your .env file
load_dotenv()

app = FastAPI()

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

# Initialize AWS Client using hidden environment configurations
s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

@app.post("/upload")
async def upload_raw_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        job_id = str(uuid.uuid4())
        
        # 1. Stream file payload up to AWS S3
        s3_client.upload_fileobj(file.file, BUCKET_NAME, file.filename)
        
        # 2. Record tracking entry inside database
        new_task = MediaTask(id=job_id, filename=file.filename, status="processing")
        db.add(new_task)
        db.commit()
        
        # 3. Fire-and-forget task handoff to Redis broker
        process_image_task.delay(job_id, file.filename)
        
        return {"status": "processing", "task_id": job_id}
    except Exception as e:
        print(f"[Server Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{task_id}")
def check_processing_status(task_id: str, db: Session = Depends(get_db)):
    task = db.query(MediaTask).filter(MediaTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Processing task not found")
    
    return {
        "task_id": task.id,
        "status": task.status,
        "optimized_url": task.optimized_url
    }