"""
FAMONEMEDIA Reverse AI - FastAPI Backend Application
Central entrypoint coordinating modular reverse-engineering pipelines,
background analysis jobs, multitrack timeline API, and local CPU model inference.
"""

from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings, get_hardware_info
from backend.app.api import (
    projects,
    upload,
    analyze,
    jobs,
    timeline,
    export,
    system,
    media,
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("FAMONEMEDIA")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup hardware audit
    hw = get_hardware_info()
    logger.info("=" * 60)
    logger.info(" FAMONEMEDIA Reverse AI - Initializing Local Engine")
    logger.info(f" CPU: {hw['cpu_count_logical']} Logical Processors ({hw['cpu_count_physical']} Cores)")
    logger.info(f" RAM: {hw['ram_available_gb']} GB Available / {hw['ram_total_gb']} GB Total")
    logger.info(f" Disk Free: {hw['disk_free_gb']} GB on drive {settings.PROJECT_ROOT.drive}")
    logger.info(f" Max CPU Worker Threads: {settings.MAX_CPU_THREADS}")
    logger.info("=" * 60)
    # Initialize relational database and sync legacy projects
    try:
        from backend.database.db import init_db, SessionLocal
        from backend.database.importer import sync_existing_projects
        init_db()
        db = SessionLocal()
        sync_existing_projects(db)
        db.close()
    except Exception as e:
        logger.warning(f"Database initialization note: {e}")
    yield
    logger.info("Shutting down FAMONEMEDIA Reverse AI Engine.")


app = FastAPI(
    title="FAMONEMEDIA Reverse AI",
    description="Local AI video reverse-engineering and editing timeline reconstruction system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(projects.router)
app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(jobs.router)
app.include_router(timeline.router)
app.include_router(export.router)
app.include_router(system.router)
app.include_router(media.router)
# Make Your Edit Independent Module
from backend.make_edit.api import router as make_edit_router
app.include_router(make_edit_router)

# CapCut + Shotcut Combined Editor Engine
from backend.editor.api import router as editor_router
app.include_router(editor_router)


@app.get("/")
def root():
    return {
        "app": "FAMONEMEDIA Reverse AI",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy", "engine": "local_cpu"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
