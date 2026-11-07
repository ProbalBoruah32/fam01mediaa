"""
FAMONEMEDIA Make Your Edit - Namespaced Storage Manager
Dedicated local persistence layer for Make Your Edit projects, asset library items,
and version snapshots. Operates entirely independently of Reverse AI storage.
"""

from __future__ import annotations
import json
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.app.config import settings
from backend.make_edit.models import MakeEditProject, AssetLibraryItem, ComponentManifest


class MakeEditStorageManager:
    def __init__(
        self,
        base_outputs_dir: Path = settings.OUTPUTS_DIR / "make_edit",
        base_assets_dir: Path = settings.STORAGE_DIR / "make_edit_assets",
    ):
        self.outputs_dir = base_outputs_dir
        self.assets_dir = base_assets_dir
        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        self.library_index_file = self.assets_dir / "asset_library.json"
        self._ensure_library_index()

    def _ensure_library_index(self):
        if not self.library_index_file.exists():
            with open(self.library_index_file, "w", encoding="utf-8") as f:
                json.dump([], f)

    def get_project_dir(self, project_id: str) -> Path:
        pdir = self.outputs_dir / project_id
        pdir.mkdir(parents=True, exist_ok=True)
        (pdir / "versions").mkdir(parents=True, exist_ok=True)
        (pdir / "renders").mkdir(parents=True, exist_ok=True)
        return pdir

    def save_project(self, project: MakeEditProject) -> None:
        pdir = self.get_project_dir(project.id)
        project.updated_at = datetime.utcnow().isoformat()
        filepath = pdir / "project.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(project.model_dump(), f, indent=2, ensure_ascii=False)

    def load_project(self, project_id: str) -> Optional[MakeEditProject]:
        filepath = self.get_project_dir(project_id) / "project.json"
        if not filepath.exists():
            return None
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                return MakeEditProject.model_validate(data)
        except Exception as e:
            print(f"[MakeEditStorage] Failed to load project {project_id}: {e}")
            return None

    def list_projects(self) -> List[MakeEditProject]:
        projects = []
        for pdir in self.outputs_dir.iterdir():
            if pdir.is_dir():
                pj_file = pdir / "project.json"
                if pj_file.exists():
                    try:
                        with open(pj_file, "r", encoding="utf-8") as f:
                            projects.append(MakeEditProject.model_validate(json.load(f)))
                    except Exception:
                        pass
        projects.sort(key=lambda p: p.updated_at, reverse=True)
        return projects

    # Asset Library Management
    def save_asset(self, asset: AssetLibraryItem) -> None:
        assets = self.list_assets()
        # Replace if existing or append
        assets = [a for a in assets if a.id != asset.id]
        assets.append(asset)
        with open(self.library_index_file, "w", encoding="utf-8") as f:
            json.dump([a.model_dump() for a in assets], f, indent=2, ensure_ascii=False)

    def list_assets(self, media_type: Optional[str] = None) -> List[AssetLibraryItem]:
        if not self.library_index_file.exists():
            return []
        try:
            with open(self.library_index_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                items = [AssetLibraryItem.model_validate(x) for x in data]
                if media_type:
                    items = [x for x in items if x.media_type == media_type]
                return items
        except Exception:
            return []

    def get_asset(self, asset_id: str) -> Optional[AssetLibraryItem]:
        assets = self.list_assets()
        for a in assets:
            if a.id == asset_id:
                return a
        return None

    def delete_asset(self, asset_id: str) -> bool:
        assets = self.list_assets()
        initial_len = len(assets)
        assets = [a for a in assets if a.id != asset_id]
        if len(assets) != initial_len:
            with open(self.library_index_file, "w", encoding="utf-8") as f:
                json.dump([a.model_dump() for a in assets], f, indent=2, ensure_ascii=False)
            return True
        return False


make_edit_storage = MakeEditStorageManager()
