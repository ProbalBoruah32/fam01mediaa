"""
FAMONEMEDIA Reverse AI - Job Polling & Cancellation API
Monitors real-time progress percentages, 10-step milestones, logs, and cancellation tokens.
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException
from backend.reverse_ai.reconstruction.models import JobStatus
from backend.reverse_ai.jobs.queue import job_manager

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=JobStatus)
def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/cancel")
def cancel_job(job_id: str):
    success = job_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or already terminated")
    return {"message": "Job cancellation requested", "job_id": job_id}
