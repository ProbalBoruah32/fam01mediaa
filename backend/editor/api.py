"""
FAMONEMEDIA CapCut + Shotcut Combined Editor Engine - API Router
FastAPI endpoints for multitrack timeline projects, media upload, Shotcut MLT export,
FFmpeg timeline rendering, and Reverse AI clip imports.
"""

from __future__ import annotations
import uuid
import json
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.editor.models import (
    EditorProject,
    EditorTrack,
    EditorClip,
    ShotcutExportPackage,
    AspectRatioPreset,
    MediaType,
    TrackType,
    ClipTransform,
    TextProperties,
)
from backend.editor.storage import editor_storage
from backend.editor.mlt_exporter import build_shotcut_export_package
from backend.editor.renderer import render_editor_timeline, PRESET_DIMENSIONS
from backend.app.config import settings

router = APIRouter(prefix="/api/editor", tags=["CapCut + Shotcut Combined Editor"])

# In-memory render job state
_render_jobs: Dict[str, Dict[str, Any]] = {}


class CreateProjectRequest(BaseModel):
    name: str = "New Creative Project"
    aspect_ratio: AspectRatioPreset = "16:9"


class RenderTimelineRequest(BaseModel):
    crf: int = 23
    export_format: str = "mp4" # "mp4" | "webm" | "mov" | "gif"
    resolution: Optional[str] = "1080p" # "720p" | "1080p" | "2k" | "4k"
    fps: Optional[float] = None


def _inspect_media_file(file_path: Path) -> Dict[str, Any]:
    """Inspects a media file using ffprobe to detect duration, width, height, and stream types."""
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration:stream=width,height,codec_type",
            "-of", "json",
            str(file_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        
        duration = float(data.get("format", {}).get("duration", 0.0))
        streams = data.get("streams", [])
        
        width = 0
        height = 0
        has_video = False
        has_audio = False
        
        for s in streams:
            ctype = s.get("codec_type")
            if ctype == "video":
                has_video = True
                width = s.get("width", 0)
                height = s.get("height", 0)
            elif ctype == "audio":
                has_audio = True

        ext = file_path.suffix.lower()
        if ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            media_type = "image"
            if duration <= 0:
                duration = 5.0  # Default 5s for static images
        elif has_video:
            media_type = "video"
        elif has_audio:
            media_type = "audio"
        else:
            media_type = "video"

        return {
            "duration": duration,
            "width": width,
            "height": height,
            "media_type": media_type,
        }
    except Exception as e:
        print(f"[EditorAPI] ffprobe inspection failed: {e}")
        return {
            "duration": 5.0,
            "width": 1920,
            "height": 1080,
            "media_type": "video",
        }


# ==========================================
# Project CRUD Endpoints
# ==========================================

@router.post("/projects", response_model=EditorProject)
def create_project(req: CreateProjectRequest):
    """Creates a new editor project initialized with standard V1, V2, and A1 tracks."""
    pid = f"proj_ed_{uuid.uuid4().hex[:8]}"
    w, h = PRESET_DIMENSIONS.get(req.aspect_ratio, (1920, 1080))

    tracks = [
        EditorTrack(
            id="track_v1",
            name="Main Video (V1)",
            type="video",
            order=0,
            clips=[],
        ),
        EditorTrack(
            id="track_v2",
            name="Overlays & Text (V2)",
            type="overlay",
            order=1,
            clips=[],
        ),
        EditorTrack(
            id="track_a1",
            name="Audio & Music (A1)",
            type="audio",
            order=2,
            clips=[],
        ),
    ]

    project = EditorProject(
        id=pid,
        name=req.name,
        aspect_ratio=req.aspect_ratio,
        width=w,
        height=h,
        fps=30.0,
        total_duration_sec=0.0,
        tracks=tracks,
        transitions=[],
    )

    editor_storage.save_project(project)
    return project


@router.get("/projects", response_model=List[EditorProject])
def list_projects():
    """Lists all saved editor projects."""
    return editor_storage.list_projects()


@router.get("/projects/{project_id}", response_model=EditorProject)
def get_project(project_id: str):
    """Loads an existing editor project by ID."""
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Editor project not found")
    return proj


@router.put("/projects/{project_id}", response_model=EditorProject)
def save_project(project_id: str, project: EditorProject):
    """Saves updated timeline state (clips, tracks, transforms) for an editor project."""
    if project.id != project_id:
        project.id = project_id
    
    # Recalculate dimensions based on aspect ratio preset
    w, h = PRESET_DIMENSIONS.get(project.aspect_ratio, (1920, 1080))
    project.width = w
    project.height = h

    # Recalculate total duration
    max_d = 0.0
    for track in project.tracks:
        for clip in track.clips:
            end_t = clip.start_time + clip.duration
            if end_t > max_d:
                max_d = end_t
    project.total_duration_sec = round(max_d, 3)

    editor_storage.save_project(project)
    return project


@router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    """Deletes an editor project and its renders."""
    success = editor_storage.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted", "project_id": project_id}


@router.post("/projects/{project_id}/duplicate", response_model=EditorProject)
def duplicate_project(project_id: str):
    """Clones an existing editor project into a new independent project."""
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    new_pid = f"proj_ed_{uuid.uuid4().hex[:8]}"
    cloned = proj.model_copy(deep=True)
    cloned.id = new_pid
    cloned.name = f"{proj.name} (Copy)"
    cloned.created_at = datetime.utcnow().isoformat()
    cloned.updated_at = datetime.utcnow().isoformat()
    
    editor_storage.save_project(cloned)
    return cloned


@router.post("/projects/{project_id}/auto-captions", response_model=EditorProject)
def generate_auto_captions(project_id: str):
    """Transcribes timeline speech using local Whisper and generates styled subtitle blocks on a dedicated track."""
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find media source file to transcribe
    source_file = None
    for track in proj.tracks:
        for clip in track.clips:
            if clip.file_path and Path(clip.file_path).exists():
                source_file = clip.file_path
                break
        if source_file:
            break

    if not source_file:
        raise HTTPException(status_code=400, detail="No media files found on timeline to transcribe")

    try:
        from backend.reverse_ai.audio.whisper_transcriber import WhisperTranscriber
        transcriber = WhisperTranscriber()
        transcript_result = transcriber.transcribe(source_file)
        segments = transcript_result.get("segments", [])

        # Find or create Subtitle / Text Track (V2 or dedicated Subtitle track)
        sub_track = next((t for t in proj.tracks if "subtitle" in t.name.lower() or t.type == "text"), None)
        if not sub_track:
            sub_track = EditorTrack(
                id=f"track_sub_{uuid.uuid4().hex[:4]}",
                name="Auto Subtitles",
                type="text",
                order=len(proj.tracks),
                clips=[],
            )
            proj.tracks.append(sub_track)

        # Clear old auto-subtitles from track
        sub_track.clips = []

        for idx, seg in enumerate(segments):
            text_str = seg.get("text", "").strip()
            if not text_str:
                continue
            st = float(seg.get("start", 0.0))
            et = float(seg.get("end", st + 2.0))
            dur = max(0.5, et - st)

            sub_clip = EditorClip(
                id=f"sub_{idx:03d}_{uuid.uuid4().hex[:4]}",
                track_id=sub_track.id,
                name=f"Sub: {text_str[:12]}...",
                media_type="text",
                start_time=st,
                duration=dur,
                text_properties=TextProperties(
                    text=text_str,
                    font_family="Arial",
                    font_size=38,
                    font_color="#ffffff",
                    background_color="#000000aa",
                    alignment="center",
                ),
            )
            sub_track.clips.append(sub_clip)

        editor_storage.save_project(proj)
        return proj
    except Exception as e:
        print(f"[AutoCaptions] Whisper transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate auto-captions: {str(e)}")


# ==========================================
# Media Upload & Serving
# ==========================================

@router.post("/upload")
async def upload_editor_media(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
):
    """Uploads user media (video, audio, image) into the editor workspace."""
    if not project_id:
        project_id = "global"

    pdir = editor_storage.get_project_dir(project_id)
    media_dir = pdir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    asset_id = f"asset_{uuid.uuid4().hex[:8]}"
    safe_filename = f"{asset_id}_{file.filename.replace(' ', '_')}"
    dest_path = media_dir / safe_filename

    with open(dest_path, "wb") as f:
        content = await file.read()
        f.write(content)

    meta = _inspect_media_file(dest_path)

    return {
        "id": asset_id,
        "name": file.filename,
        "filename": safe_filename,
        "file_path": str(dest_path.resolve()),
        "media_url": f"/api/editor/media/{project_id}/{safe_filename}",
        "media_type": meta["media_type"],
        "duration": meta["duration"],
        "width": meta["width"],
        "height": meta["height"],
    }


@router.get("/media/{project_id}/{filename}")
def serve_editor_media(project_id: str, filename: str):
    """Serves media assets for the browser timeline player."""
    pdir = editor_storage.get_project_dir(project_id)
    target = pdir / "media" / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="Media file not found")
    return FileResponse(target)


# ==========================================
# Reverse AI Project Import
# ==========================================

@router.post("/projects/{project_id}/import-reverse/{reverse_proj_id}", response_model=EditorProject)
def import_reverse_ai_project(project_id: str, reverse_proj_id: str):
    """
    Imports detected cuts and OCR text overlays from a Reverse AI project
    directly into the editor multitrack timeline.
    """
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Editor project not found")

    rev_dir = settings.OUTPUTS_DIR / reverse_proj_id
    rev_json = rev_dir / "project.json"
    if not rev_json.exists():
        # Check storage dir
        rev_dir = settings.STORAGE_DIR / reverse_proj_id
        rev_json = rev_dir / "project.json"

    if not rev_json.exists():
        raise HTTPException(status_code=404, detail=f"Reverse AI project '{reverse_proj_id}' not found")

    with open(rev_json, "r", encoding="utf-8") as f:
        rev_data = json.load(f)

    # Find V1 and V2 tracks in editor project
    v1_track = next((t for t in proj.tracks if t.type == "video"), None)
    if not v1_track:
        v1_track = EditorTrack(id="track_v1", name="Main Video (V1)", type="video", order=0, clips=[])
        proj.tracks.append(v1_track)

    v2_track = next((t for t in proj.tracks if t.type == "overlay"), None)
    if not v2_track:
        v2_track = EditorTrack(id="track_v2", name="Overlays & Text (V2)", type="overlay", order=1, clips=[])
        proj.tracks.append(v2_track)

    # Original video file
    video_source = rev_data.get("video_file") or rev_data.get("file_path")
    clips_data = rev_data.get("clips") or rev_data.get("scene_boundaries") or []
    ocr_events = rev_data.get("ocr_events") or []

    # Map video shots into V1 track
    for idx, c in enumerate(clips_data):
        start_t = float(c.get("start_time", 0.0))
        end_t = float(c.get("end_time", start_t + 2.0))
        dur = max(end_t - start_t, 0.1)

        clip_id = f"clip_rev_{idx:03d}_{uuid.uuid4().hex[:4]}"
        thumb = c.get("thumbnail_path") or c.get("keyframe_path")

        editor_clip = EditorClip(
            id=clip_id,
            track_id=v1_track.id,
            name=f"Shot {idx + 1:02d} ({c.get('scene_type', 'detected')})",
            media_type="video",
            file_path=video_source,
            media_url=f"/api/media/{reverse_proj_id}/video" if video_source else None,
            start_time=start_t,
            duration=dur,
            trim_in=start_t,
            trim_out=end_t,
            speed=1.0,
            volume=1.0,
        )
        v1_track.clips.append(editor_clip)

    # Map OCR events into V2 track
    for idx, o in enumerate(ocr_events):
        start_t = float(o.get("start_time", 0.0))
        dur = float(o.get("duration", 3.0))
        text_str = o.get("text", "")

        if not text_str:
            continue

        text_clip = EditorClip(
            id=f"clip_ocr_{idx:03d}_{uuid.uuid4().hex[:4]}",
            track_id=v2_track.id,
            name=f"Text: {text_str[:15]}...",
            media_type="text",
            start_time=start_t,
            duration=dur,
            text_properties=TextProperties(
                text=text_str,
                font_family="Arial",
                font_size=42,
                font_color="#ffffff",
                alignment="center",
            ),
        )
        v2_track.clips.append(text_clip)

    # Recalculate duration & save
    max_d = 0.0
    for track in proj.tracks:
        for clip in track.clips:
            end_t = clip.start_time + clip.duration
            if end_t > max_d:
                max_d = end_t
    proj.total_duration_sec = round(max_d, 3)

    editor_storage.save_project(proj)
    return proj


# ==========================================
# Shotcut Desktop MLT XML Export
# ==========================================

@router.post("/projects/{project_id}/export-shotcut", response_model=ShotcutExportPackage)
def export_shotcut(project_id: str):
    """
    Builds the complete Shotcut package:
    Generates MLT XML file and creates a portable .zip archive with referenced media.
    """
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Editor project not found")

    pkg = build_shotcut_export_package(proj)
    return pkg


@router.get("/projects/{project_id}/download-shotcut-zip")
def download_shotcut_zip(project_id: str):
    """Downloads the portable Shotcut .zip bundle."""
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    pdir = editor_storage.get_project_dir(project_id)
    safe_name = proj.name.replace(" ", "_").lower()
    zip_path = pdir / f"{safe_name}_shotcut_bundle.zip"

    if not zip_path.exists():
        # Build if not generated yet
        build_shotcut_export_package(proj)

    if not zip_path.exists():
        raise HTTPException(status_code=500, detail="Failed to create Shotcut ZIP bundle")

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"{safe_name}_shotcut_bundle.zip",
    )


@router.get("/projects/{project_id}/download-shotcut-mlt")
def download_shotcut_mlt(project_id: str):
    """Downloads the standalone Shotcut .mlt XML file."""
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    pdir = editor_storage.get_project_dir(project_id)
    safe_name = proj.name.replace(" ", "_").lower()
    mlt_path = pdir / "shotcut_bundle" / f"{safe_name}.mlt"

    if not mlt_path.exists():
        build_shotcut_export_package(proj)

    if not mlt_path.exists():
        raise HTTPException(status_code=500, detail="MLT project file not found")

    return FileResponse(
        mlt_path,
        media_type="application/xml",
        filename=f"{safe_name}.mlt",
    )


# ==========================================
# FFmpeg Video Rendering & Jobs
# ==========================================

def _run_render_job(
    job_id: str,
    project: EditorProject,
    output_file: Path,
    crf: int,
    export_format: str = "mp4",
    resolution: Optional[str] = None,
    override_fps: Optional[float] = None,
):
    """Worker function executing the render process in a background thread."""
    def on_progress(pct: int, msg: str):
        if job_id in _render_jobs:
            _render_jobs[job_id]["progress"] = pct
            _render_jobs[job_id]["message"] = msg

    try:
        _render_jobs[job_id]["status"] = "processing"
        render_editor_timeline(
            project=project,
            output_filepath=output_file,
            crf=crf,
            export_format=export_format,
            resolution=resolution,
            override_fps=override_fps,
            progress_callback=on_progress,
        )
        _render_jobs[job_id]["status"] = "completed"
        _render_jobs[job_id]["progress"] = 100
        _render_jobs[job_id]["message"] = "Render completed successfully!"
        _render_jobs[job_id]["output_url"] = f"/api/editor/renders/{project.id}/{output_file.name}"
    except Exception as e:
        print(f"[RenderJob Error] {e}")
        _render_jobs[job_id]["status"] = "failed"
        _render_jobs[job_id]["message"] = f"Render failed: {str(e)}"


@router.post("/projects/{project_id}/render")
def trigger_render(
    project_id: str,
    req: RenderTimelineRequest,
    background_tasks: BackgroundTasks,
):
    """Starts background rendering of the project timeline into MP4, WebM, MOV, or GIF."""
    proj = editor_storage.load_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    job_id = f"job_ed_{uuid.uuid4().hex[:8]}"
    pdir = editor_storage.get_project_dir(project_id)
    renders_dir = pdir / "renders"
    renders_dir.mkdir(parents=True, exist_ok=True)

    ext = req.export_format.lower()
    if ext not in ["mp4", "webm", "mov", "gif"]:
        ext = "mp4"

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_filename = f"render_{proj.name.replace(' ', '_').lower()}_{timestamp}.{ext}"
    out_path = renders_dir / out_filename

    _render_jobs[job_id] = {
        "job_id": job_id,
        "project_id": project_id,
        "status": "queued",
        "progress": 0,
        "message": f"Initializing CPU render ({req.resolution or '1080p'} {ext.upper()})...",
        "output_url": None,
        "created_at": datetime.utcnow().isoformat(),
    }

    thread = threading.Thread(
        target=_run_render_job,
        args=(job_id, proj, out_path, req.crf, req.export_format, req.resolution, req.fps),
        daemon=True,
    )
    thread.start()

    return _render_jobs[job_id]


@router.get("/jobs/{job_id}")
def get_render_job_status(job_id: str):
    """Polls progress of a rendering job."""
    if job_id not in _render_jobs:
        raise HTTPException(status_code=404, detail="Render job not found")
    return _render_jobs[job_id]


@router.get("/renders/{project_id}/{filename}")
def serve_rendered_video(project_id: str, filename: str):
    """Serves the rendered MP4 video file for preview or download."""
    pdir = editor_storage.get_project_dir(project_id)
    target = pdir / "renders" / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="Rendered file not found")
    return FileResponse(target, media_type="video/mp4")


# ==========================================
# Dashboard & Central Asset Library Endpoints
# ==========================================

from backend.database.db import SessionLocal, init_db
from backend.database.models import DBProject, DBAsset
from backend.database.importer import sync_existing_projects
from backend.editor.asset_manager import ingest_media_file, ASSETS_DIR, THUMBS_DIR


@router.get("/dashboard")
def get_dashboard_summary():
    """Returns aggregated platform metrics, recent projects, and recently used media assets."""
    db = SessionLocal()
    try:
        sync_existing_projects(db)

        projects = db.query(DBProject).order_by(DBProject.updated_at.desc()).limit(20).all()
        assets = db.query(DBAsset).order_by(DBAsset.created_at.desc()).limit(20).all()

        total_projects = db.query(DBProject).count()
        total_assets = db.query(DBAsset).count()

        # Compute storage used
        total_bytes = 0
        for p in [settings.STORAGE_DIR, settings.OUTPUTS_DIR]:
            if p.exists():
                for f in p.rglob("*"):
                    if f.is_file():
                        total_bytes += f.stat().st_size

        return {
            "stats": {
                "total_projects": total_projects,
                "total_assets": total_assets,
                "storage_used_bytes": total_bytes,
                "storage_used_mb": round(total_bytes / (1024 * 1024), 1),
            },
            "recent_projects": [
                {
                    "id": p.id,
                    "name": p.name,
                    "project_type": p.project_type,
                    "aspect_ratio": p.aspect_ratio,
                    "width": p.width,
                    "height": p.height,
                    "fps": p.fps,
                    "duration_sec": p.duration_sec,
                    "total_clips": p.total_clips,
                    "thumbnail_url": p.thumbnail_url,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                }
                for p in projects
            ],
            "recent_assets": [
                {
                    "id": a.id,
                    "name": a.name,
                    "filename": a.filename,
                    "media_type": a.media_type,
                    "media_url": a.media_url,
                    "thumbnail_url": a.thumbnail_url,
                    "duration_sec": a.duration_sec,
                    "width": a.width,
                    "height": a.height,
                    "file_size_bytes": a.file_size_bytes,
                    "waveform": json.loads(a.waveform_json) if a.waveform_json else None,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in assets
            ],
        }
    finally:
        db.close()


@router.get("/assets")
def list_assets(media_type: Optional[str] = None, search: Optional[str] = None):
    """Lists media assets with optional type and search filtering."""
    db = SessionLocal()
    try:
        q = db.query(DBAsset)
        if media_type and media_type != "all":
            q = q.filter(DBAsset.media_type == media_type)
        if search:
            q = q.filter(DBAsset.name.ilike(f"%{search}%"))
        assets = q.order_by(DBAsset.created_at.desc()).all()
        return [
            {
                "id": a.id,
                "name": a.name,
                "filename": a.filename,
                "media_type": a.media_type,
                "media_url": a.media_url,
                "thumbnail_url": a.thumbnail_url,
                "duration_sec": a.duration_sec,
                "width": a.width,
                "height": a.height,
                "file_size_bytes": a.file_size_bytes,
                "waveform": json.loads(a.waveform_json) if a.waveform_json else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in assets
        ]
    finally:
        db.close()


@router.post("/assets/upload")
async def upload_asset_to_library(file: UploadFile = File(...)):
    """Uploads media asset to central library and extracts metadata, thumbnail, and waveforms."""
    import tempfile
    temp_dir = Path(tempfile.mkdtemp(prefix="asset_up_"))
    try:
        temp_file = temp_dir / file.filename
        with open(temp_file, "wb") as f:
            content = await file.read()
            f.write(content)

        db_asset = ingest_media_file(temp_file, file.filename)
        return {
            "id": db_asset.id,
            "name": db_asset.name,
            "filename": db_asset.filename,
            "media_type": db_asset.media_type,
            "media_url": db_asset.media_url,
            "thumbnail_url": db_asset.thumbnail_url,
            "duration_sec": db_asset.duration_sec,
            "width": db_asset.width,
            "height": db_asset.height,
            "file_size_bytes": db_asset.file_size_bytes,
            "waveform": json.loads(db_asset.waveform_json) if db_asset.waveform_json else None,
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.delete("/assets/{asset_id}")
def delete_asset_from_library(asset_id: str):
    """Deletes an asset from the database and file storage."""
    db = SessionLocal()
    try:
        ast = db.query(DBAsset).filter(DBAsset.id == asset_id).first()
        if not ast:
            raise HTTPException(status_code=404, detail="Asset not found")
        fpath = Path(ast.file_path)
        if fpath.exists():
            fpath.unlink(missing_ok=True)
        db.delete(ast)
        db.commit()
        return {"status": "deleted", "id": asset_id}
    finally:
        db.close()


@router.get("/assets/file/{filename}")
def serve_asset_file(filename: str):
    """Serves media asset file for video player playback."""
    target = ASSETS_DIR / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(target)


@router.get("/assets/thumb/{filename}")
def serve_asset_thumb(filename: str):
    """Serves generated thumbnail image."""
    target = THUMBS_DIR / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(target, media_type="image/jpeg")
