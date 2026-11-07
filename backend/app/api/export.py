"""
FAMONEMEDIA Reverse AI - Timeline Export API
Downloads OpenTimelineIO (.otio), CMX 3600 EDL (.edl), JSON, SRT, and CSV files.
"""

from __future__ import annotations
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from backend.reverse_ai.jobs.storage import storage_manager
from backend.reverse_ai.export.otio_exporter import export_to_otio
from backend.reverse_ai.export.edl_exporter import export_to_edl
from backend.reverse_ai.export.json_exporter import export_to_json
from backend.reverse_ai.export.srt_exporter import export_to_srt
from backend.reverse_ai.export.csv_exporter import export_to_csv

router = APIRouter(prefix="/api/projects", tags=["Export"])


@router.get("/{project_id}/export")
def export_project_timeline(
    project_id: str,
    format: str = Query("otio", pattern="^(otio|edl|json|srt|csv)$"),
):
    project = storage_manager.load_project(project_id)
    if not project or not project.timeline:
        raise HTTPException(status_code=404, detail="Project or timeline not found")

    exports_dir = storage_manager.get_exports_dir(project_id)
    timeline = project.timeline

    if format == "otio":
        target = exports_dir / f"{project_id}.otio"
        export_to_otio(timeline, target)
        media_type = "application/json"
        filename = f"{project.name.replace(' ', '_')}.otio"

    elif format == "edl":
        target = exports_dir / f"{project_id}.edl"
        export_to_edl(timeline, target)
        media_type = "text/plain"
        filename = f"{project.name.replace(' ', '_')}.edl"

    elif format == "json":
        target = exports_dir / f"{project_id}.json"
        export_to_json(timeline, target)
        media_type = "application/json"
        filename = f"{project.name.replace(' ', '_')}_timeline.json"

    elif format == "srt":
        target = exports_dir / f"{project_id}.srt"
        export_to_srt(timeline.transcript, target)
        media_type = "text/plain"
        filename = f"{project.name.replace(' ', '_')}_subtitles.srt"

    elif format == "csv":
        target = exports_dir / f"{project_id}.csv"
        export_to_csv(timeline, target)
        media_type = "text/csv"
        filename = f"{project.name.replace(' ', '_')}_clips.csv"

    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

    if not target.exists():
        raise HTTPException(status_code=500, detail="Failed to generate export file")

    return FileResponse(
        path=str(target),
        filename=filename,
        media_type=media_type,
    )
