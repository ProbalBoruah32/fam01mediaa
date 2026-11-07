"""
FAMONEMEDIA Reverse AI - Media Streaming & Asset Delivery API
Delivers thumbnails, representative frames, and video streams with HTTP 206 Partial Content support.
"""

from __future__ import annotations
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import FileResponse, Response
from backend.app.config import settings
from backend.reverse_ai.jobs.storage import storage_manager

router = APIRouter(prefix="/api/media", tags=["Media"])


@router.get("/thumbnail/{project_id}/{filename}")
def get_thumbnail(project_id: str, filename: str):
    file_path = storage_manager.get_thumbnails_dir(project_id) / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(str(file_path), media_type="image/jpeg")


@router.get("/frame/{project_id}/{filename}")
def get_frame(project_id: str, filename: str):
    file_path = storage_manager.get_frames_dir(project_id) / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Frame not found")
    return FileResponse(str(file_path), media_type="image/jpeg")


@router.get("/video/{project_id}")
def stream_video(project_id: str, request: Request):
    project = storage_manager.load_project(project_id)
    if not project or not project.video_path:
        raise HTTPException(status_code=404, detail="Video not found for this project")

    path = Path(project.video_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video file missing on disk")

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    # If no Range header, return full file
    if not range_header:
        return FileResponse(str(path), media_type="video/mp4")

    # Parse Range: bytes=start-end
    try:
        range_val = range_header.replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
    except Exception:
        start = 0
        end = file_size - 1

    start = max(0, start)
    end = min(file_size - 1, end)
    content_length = (end - start) + 1

    with open(path, "rb") as f:
        f.seek(start)
        data = f.read(content_length)

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "video/mp4",
    }

    return Response(content=data, status_code=status.HTTP_206_PARTIAL_CONTENT, headers=headers)
