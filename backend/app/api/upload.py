"""
FAMONEMEDIA Reverse AI - Video Upload API
Accepts MP4, MOV, MKV reference video files, validates them, and probes initial stream metadata.
"""

from __future__ import annotations
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.app.config import settings
from backend.reverse_ai.jobs.storage import storage_manager
from backend.reverse_ai.ingestion.probe import probe_video

router = APIRouter(prefix="/api/projects", tags=["Upload"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}


@router.post("/{project_id}/upload")
async def upload_reference_video(
    project_id: str,
    file: UploadFile = File(...),
):
    project = storage_manager.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Allowed formats: MP4, MOV, MKV, AVI, WEBM.",
        )

    # Save to storage directory
    safe_filename = f"{project_id}_{Path(file.filename).name}"
    target_path = settings.STORAGE_DIR / safe_filename

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")
    finally:
        await file.close()

    try:
        metadata = probe_video(target_path)
    except Exception as e:
        target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Failed to decode video file: {e}")

    project.video_filename = file.filename
    project.video_path = str(target_path.resolve())
    project.video_metadata = metadata
    project.status = "uploaded"
    storage_manager.save_project(project)

    return {
        "message": "File uploaded and verified successfully",
        "project": project,
        "metadata": metadata,
    }
