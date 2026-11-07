"""
FAMONEMEDIA Reverse AI - Analysis Trigger API
Initiates non-blocking multi-stage AI reverse-engineering pipeline in background worker.
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from backend.reverse_ai.jobs.storage import storage_manager
from backend.reverse_ai.jobs.queue import job_manager
from backend.reverse_ai.jobs.pipeline import run_reverse_ai_pipeline

router = APIRouter(prefix="/api/projects", tags=["Analysis"])


class AnalyzeResponse(BaseModel):
    job_id: str
    project_id: str
    status: str
    message: str


@router.post("/{project_id}/analyze", response_model=AnalyzeResponse)
def trigger_analysis(project_id: str):
    project = storage_manager.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.video_path:
        raise HTTPException(status_code=400, detail="Project has no uploaded reference video")

    job_status = job_manager.create_job(project_id)
    job_manager.start_job(
        job_status.id,
        run_reverse_ai_pipeline,
        project_id,
        project.video_path,
    )

    return AnalyzeResponse(
        job_id=job_status.id,
        project_id=project_id,
        status="running",
        message="Reverse engineering workflow started in background",
    )
