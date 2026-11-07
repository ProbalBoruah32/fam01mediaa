"""
FAMONEMEDIA Legacy Project Importer & Scanner
Scans existing outputs directories and synchronizes projects into the relational database.
Never overwrites, alters, or destroys any existing project JSON files.
"""

from __future__ import annotations
import json
from pathlib import Path
from sqlalchemy.orm import Session
from backend.database.models import DBProject
from backend.app.config import settings


def sync_existing_projects(db: Session):
    """Scans disk directories and synchronizes records into DBProject."""
    outputs_dir = settings.OUTPUTS_DIR
    if not outputs_dir.exists():
        return

    # 1. Reverse AI Projects (outputs/proj_*)
    for pdir in outputs_dir.iterdir():
        if pdir.is_dir() and pdir.name.startswith("proj_"):
            pfile = pdir / "project.json"
            if pfile.exists():
                try:
                    with open(pfile, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    pid = data.get("id") or pdir.name
                    existing = db.query(DBProject).filter(DBProject.id == pid).first()
                    if not existing:
                        clips = data.get("clips") or data.get("timeline", {}).get("clips") or []
                        db_proj = DBProject(
                            id=pid,
                            name=data.get("name", f"Reverse Project {pid[:8]}"),
                            project_type="reverse",
                            aspect_ratio="16:9",
                            width=1920,
                            height=1080,
                            fps=30.0,
                            duration_sec=float(data.get("duration", 0.0) or (data.get("timeline") or {}).get("total_duration", 0.0)),
                            total_clips=len(clips),
                            thumbnail_url=f"/api/media/{pid}/thumbnail" if (pdir / "thumbnails").exists() else None,
                            data_json=json.dumps(data),
                        )
                        db.add(db_proj)
                except Exception as e:
                    print(f"[ProjectScanner] Failed to parse {pfile}: {e}")

    # 2. Make Your Edit Projects (outputs/make_edit/medit_*)
    make_edit_dir = outputs_dir / "make_edit"
    if make_edit_dir.exists():
        for pdir in make_edit_dir.iterdir():
            if pdir.is_dir():
                mfile = pdir / "manifest.json"
                if mfile.exists():
                    try:
                        with open(mfile, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        pid = data.get("project_id") or pdir.name
                        existing = db.query(DBProject).filter(DBProject.id == pid).first()
                        if not existing:
                            comps = data.get("components", [])
                            db_proj = DBProject(
                                id=pid,
                                name=data.get("project_name", f"Remix {pid[:8]}"),
                                project_type="make_edit",
                                aspect_ratio=data.get("aspect_ratio", "16:9"),
                                width=1920,
                                height=1080,
                                fps=float(data.get("fps", 30.0)),
                                duration_sec=float(data.get("total_duration", 0.0)),
                                total_clips=len([c for c in comps if c.get("category") == "video_clip"]),
                                data_json=json.dumps(data),
                            )
                            db.add(db_proj)
                    except Exception as e:
                        print(f"[ProjectScanner] Failed to parse {mfile}: {e}")

    # 3. Creative Editor Projects (outputs/editor/proj_ed_*)
    editor_dir = outputs_dir / "editor"
    if editor_dir.exists():
        for pdir in editor_dir.iterdir():
            if pdir.is_dir():
                proj_file = pdir / "project.json"
                if proj_file.exists():
                    try:
                        with open(proj_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        pid = data.get("id") or pdir.name
                        existing = db.query(DBProject).filter(DBProject.id == pid).first()
                        if not existing:
                            tracks = data.get("tracks", [])
                            all_clips = [c for t in tracks for c in t.get("clips", [])]
                            db_proj = DBProject(
                                id=pid,
                                name=data.get("name", "Creative Project"),
                                project_type="editor",
                                aspect_ratio=data.get("aspect_ratio", "16:9"),
                                width=data.get("width", 1920),
                                height=data.get("height", 1080),
                                fps=float(data.get("fps", 30.0)),
                                duration_sec=float(data.get("total_duration_sec", 0.0)),
                                total_clips=len(all_clips),
                                data_json=json.dumps(data),
                            )
                            db.add(db_proj)
                    except Exception as e:
                        print(f"[ProjectScanner] Failed to parse {proj_file}: {e}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ProjectScanner] Commit error: {e}")
