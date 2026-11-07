"""
FAMONEMEDIA CapCut + Shotcut Combined Editor Engine - Storage Manager
Manages project persistence under outputs/editor/{project_id}/ and media exports.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from backend.app.config import settings
from backend.editor.models import EditorProject, EditorTrack, EditorClip


class EditorStorageManager:
    def __init__(self):
        self.base_dir: Path = settings.OUTPUTS_DIR / "editor"
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def get_project_dir(self, project_id: str) -> Path:
        pdir = self.base_dir / project_id
        pdir.mkdir(parents=True, exist_ok=True)
        (pdir / "renders").mkdir(exist_ok=True)
        (pdir / "shotcut_bundle").mkdir(exist_ok=True)
        return pdir

    def save_project(self, project: EditorProject) -> None:
        pdir = self.get_project_dir(project.id)
        project.updated_at = datetime.utcnow().isoformat()
        target = pdir / "project.json"
        with open(target, "w", encoding="utf-8") as f:
            json.dump(project.model_dump(), f, indent=2, ensure_ascii=False)

    def load_project(self, project_id: str) -> Optional[EditorProject]:
        target = self.get_project_dir(project_id) / "project.json"
        if not target.exists():
            return None
        try:
            with open(target, "r", encoding="utf-8") as f:
                data = json.load(f)
            return EditorProject.model_validate(data)
        except Exception as e:
            print(f"[EditorStorage] Failed to load project {project_id}: {e}")
            return None

    def list_projects(self) -> List[EditorProject]:
        projects = []
        if not self.base_dir.exists():
            return []
        for pdir in self.base_dir.iterdir():
            if pdir.is_dir():
                proj_file = pdir / "project.json"
                if proj_file.exists():
                    try:
                        with open(proj_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        projects.append(EditorProject.model_validate(data))
                    except Exception:
                        pass
        projects.sort(key=lambda p: p.updated_at, reverse=True)
        return projects

    def delete_project(self, project_id: str) -> bool:
        pdir = self.base_dir / project_id
        if pdir.exists():
            import shutil
            shutil.rmtree(pdir, ignore_errors=True)
            return True
        return False


editor_storage = EditorStorageManager()
