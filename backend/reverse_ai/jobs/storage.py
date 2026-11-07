"""
FAMONEMEDIA Reverse AI - Local Storage Manager
Persists and retrieves projects, metadata, and timeline states on the local filesystem.
"""

from __future__ import annotations
import json
import shutil
from pathlib import Path
from typing import Optional, List
from datetime import datetime
from backend.app.config import settings
from backend.reverse_ai.reconstruction.models import Project, UnifiedTimeline


class StorageManager:
    def __init__(self, outputs_dir: Path = settings.OUTPUTS_DIR, storage_dir: Path = settings.STORAGE_DIR):
        self.outputs_dir = outputs_dir
        self.storage_dir = storage_dir
        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def get_project_dir(self, project_id: str) -> Path:
        pdir = self.outputs_dir / project_id
        pdir.mkdir(parents=True, exist_ok=True)
        return pdir

    def get_thumbnails_dir(self, project_id: str) -> Path:
        tdir = self.get_project_dir(project_id) / "thumbnails"
        tdir.mkdir(parents=True, exist_ok=True)
        return tdir

    def get_exports_dir(self, project_id: str) -> Path:
        edir = self.get_project_dir(project_id) / "exports"
        edir.mkdir(parents=True, exist_ok=True)
        return edir

    def get_frames_dir(self, project_id: str) -> Path:
        fdir = self.get_project_dir(project_id) / "frames"
        fdir.mkdir(parents=True, exist_ok=True)
        return fdir

    def save_project(self, project: Project) -> None:
        pdir = self.get_project_dir(project.id)
        project.updated_at = datetime.utcnow().isoformat()
        filepath = pdir / "project.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(project.model_dump(), f, indent=2, ensure_ascii=False)

    def load_project(self, project_id: str) -> Optional[Project]:
        filepath = self.get_project_dir(project_id) / "project.json"
        if not filepath.exists():
            return None
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return Project.model_validate(data)

    def list_projects(self) -> List[Project]:
        projects = []
        for pdir in self.outputs_dir.iterdir():
            if pdir.is_dir():
                pj_file = pdir / "project.json"
                if pj_file.exists():
                    try:
                        with open(pj_file, "r", encoding="utf-8") as f:
                            projects.append(Project.model_validate(json.load(f)))
                    except Exception:
                        pass
        # Sort by updated_at descending
        projects.sort(key=lambda p: p.updated_at, reverse=True)
        return projects

    def delete_project(self, project_id: str) -> bool:
        pdir = self.outputs_dir / project_id
        if pdir.exists() and pdir.is_dir():
            shutil.rmtree(pdir)
            return True
        return False


storage_manager = StorageManager()
