"""
FAMONEMEDIA Reverse AI - Projects API
Handles project creation, retrieval, listing, and deletion.
"""

from __future__ import annotations
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from backend.reverse_ai.reconstruction.models import Project
from backend.reverse_ai.jobs.storage import storage_manager

router = APIRouter(prefix="/api/projects", tags=["Projects"])


class CreateProjectRequest(BaseModel):
    name: str = "Untitled Project"


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(req: CreateProjectRequest):
    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    project = Project(id=project_id, name=req.name.strip() or "Untitled Project")
    storage_manager.save_project(project)
    return project


@router.get("", response_model=List[Project])
def list_projects():
    return storage_manager.list_projects()


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str):
    project = storage_manager.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str):
    success = storage_manager.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return None
