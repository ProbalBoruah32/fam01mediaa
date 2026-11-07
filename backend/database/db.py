"""
FAMONEMEDIA Database Manager (SQLAlchemy + SQLite / PostgreSQL)
Provides thread-safe sessions and auto-initialization.
"""

from __future__ import annotations
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.database.models import Base
from backend.app.config import settings

DB_DIR = settings.STORAGE_DIR
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "famonemedia.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{str(DB_PATH.resolve()).replace(chr(92), '/')}")

# SQLite connection args for multi-threaded FastAPI workers
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initializes database tables on application startup."""
    Base.metadata.create_all(bind=engine)
    print(f"[Database] Initialized tables successfully at {DB_PATH.name}")


def get_db():
    """FastAPI dependency for obtaining a database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
