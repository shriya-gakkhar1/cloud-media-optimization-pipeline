from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

DATABASE_URL = "sqlite:///./project.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class MediaTask(Base):
    """
    The Database Table Model that tracks the real-time lifecycle 
    of every single uploaded image asset.
    """
    __tablename__ = "media_tasks"

    id = Column(String, primary_key=True, index=True) # The unique Celery Task ID
    filename = Column(String, index=True)
    status = Column(String, default="processing")    # processing, completed, failed
    optimized_url = Column(String, nullable=True)     # The final live public cloud link
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)