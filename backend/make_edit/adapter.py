"""
FAMONEMEDIA Make Your Edit - Reverse AI Read-Only Adapter
Safe, isolated read-only loader that consumes completed Reverse AI project outputs
WITHOUT modifying, writing, or deleting original Reverse AI files.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Optional, Dict, Any
from backend.app.config import settings


class ReverseAIReadOnlyAdapter:
    """
    Read-only boundary adapter.
    Guarantees that Make Your Edit reads completed analysis data
    without interfering with Reverse AI pipeline or storage.
    """
    def __init__(self, outputs_dir: Path = settings.OUTPUTS_DIR):
        self.outputs_dir = outputs_dir

    def get_completed_analysis(self, reverse_project_id: str) -> Dict[str, Any]:
        """
        Loads the completed analysis project JSON file in read-only mode.
        Raises ValueError if project does not exist or analysis has not completed.
        """
        proj_file = self.outputs_dir / reverse_project_id / "project.json"
        if not proj_file.exists():
            raise FileNotFoundError(f"Reverse AI project not found at: {proj_file}")

        try:
            with open(proj_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            raise ValueError(f"Failed to read Reverse AI project data: {e}")

        status = data.get("status")
        if status != "completed" or not data.get("timeline"):
            raise ValueError(
                f"Reverse AI project '{reverse_project_id}' is in status '{status}'. "
                "Analysis must be completed with a generated timeline before Make Your Edit can import it."
            )

        return data

    def get_source_video_path(self, reverse_project_id: str) -> Optional[str]:
        """Returns the original reference video path (read-only reference)."""
        data = self.get_completed_analysis(reverse_project_id)
        return data.get("video_path")


reverse_ai_adapter = ReverseAIReadOnlyAdapter()
