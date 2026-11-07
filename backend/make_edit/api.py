"""
FAMONEMEDIA Make Your Edit - Namespaced FastAPI Router
Exposes dedicated endpoints for project creation, Reverse AI analysis import,
component manifest management, smart asset matching, replacements, versioning, and rendering.
"""

from __future__ import annotations
import shutil
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.app.config import settings
from backend.make_edit.models import (
    MakeEditProject,
    ComponentManifest,
    ComponentItem,
    AssetLibraryItem,
    MatchSuggestion,
    RenderJob,
)
from backend.make_edit.storage import make_edit_storage
from backend.make_edit.adapter import reverse_ai_adapter
from backend.make_edit.manifest import generate_component_manifest
from backend.make_edit.matching import suggest_component_matches
from backend.make_edit.replacement import (
    apply_component_replacement,
    reset_component_to_original,
    remove_component,
    bulk_replace_category,
)
from backend.make_edit.versioning import create_project_version, restore_project_version
from backend.make_edit.editor_adapter import manifest_to_opencut_format, manifest_to_otio_format
from backend.make_edit.renderer import render_customized_timeline

router = APIRouter(prefix="/api/make-edit", tags=["Make Your Edit"])

# In-memory render job status store
RENDER_JOBS: Dict[str, RenderJob] = {}


# --- Project CRUD ---

class CreateProjectRequest(BaseModel):
    name: str = "My Custom Edit"
    reverse_ai_project_id: str


@router.post("/projects", response_model=MakeEditProject, status_code=status.HTTP_201_CREATED)
def create_make_edit_project(req: CreateProjectRequest):
    # 1. Read completed analysis from Reverse AI in read-only mode
    analysis_data = reverse_ai_adapter.get_completed_analysis(req.reverse_ai_project_id)
    
    project_id = f"medit_{uuid.uuid4().hex[:10]}"
    manifest = generate_component_manifest(project_id, analysis_data)
    
    project = MakeEditProject(
        id=project_id,
        name=req.name.strip() or "My Custom Edit",
        reverse_ai_project_id=req.reverse_ai_project_id,
        manifest=manifest,
    )
    
    # Save initial version v001
    create_project_version(project, name="Initial Reconstructed Version", description="Imported from Reverse AI analysis.")
    make_edit_storage.save_project(project)
    return project


@router.get("/projects", response_model=List[MakeEditProject])
def list_make_edit_projects():
    return make_edit_storage.list_projects()


@router.get("/projects/{project_id}", response_model=MakeEditProject)
def get_make_edit_project(project_id: str):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Make Your Edit project not found")
    return project


@router.post("/projects/{project_id}/import-analysis", response_model=ComponentManifest)
def reimport_reverse_ai_analysis(project_id: str):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    analysis_data = reverse_ai_adapter.get_completed_analysis(project.reverse_ai_project_id)
    manifest = generate_component_manifest(project_id, analysis_data)
    project.manifest = manifest
    create_project_version(project, name="Re-imported Analysis", description="Refreshed components from Reverse AI output.")
    make_edit_storage.save_project(project)
    return manifest


# --- Component Manifest & Replacement ---

@router.get("/projects/{project_id}/components", response_model=List[ComponentItem])
def get_project_components(
    project_id: str,
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status: original, replaced, etc."),
):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    items = project.manifest.components
    if category:
        items = [c for c in items if c.category == category]
    if status:
        items = [c for c in items if c.status == status]
    return items


class ReplaceRequest(BaseModel):
    component_id: str
    asset_id: Optional[str] = None
    replacement_text: Optional[str] = None
    fit_mode: str = "crop"
    trim_in: float = 0.0
    trim_out: Optional[float] = None
    volume: float = 1.0
    playback_speed: float = 1.0
    font_color: Optional[str] = None


@router.post("/projects/{project_id}/replace", response_model=ComponentItem)
def replace_component(project_id: str, req: ReplaceRequest):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    asset = make_edit_storage.get_asset(req.asset_id) if req.asset_id else None

    updated_comp = apply_component_replacement(
        manifest=project.manifest,
        component_id=req.component_id,
        asset=asset,
        replacement_text=req.replacement_text,
        fit_mode=req.fit_mode,
        trim_in=req.trim_in,
        trim_out=req.trim_out,
        volume=req.volume,
        playback_speed=req.playback_speed,
        font_color=req.font_color,
    )
    make_edit_storage.save_project(project)
    return updated_comp


@router.post("/projects/{project_id}/reset/{component_id}", response_model=ComponentItem)
def reset_component(project_id: str, component_id: str):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updated_comp = reset_component_to_original(project.manifest, component_id)
    make_edit_storage.save_project(project)
    return updated_comp


@router.post("/projects/{project_id}/remove/{component_id}", response_model=ComponentItem)
def remove_component_action(project_id: str, component_id: str):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updated_comp = remove_component(project.manifest, component_id)
    make_edit_storage.save_project(project)
    return updated_comp


@router.patch("/projects/{project_id}/components/{component_id}", response_model=ComponentItem)
def patch_component(project_id: str, component_id: str, req: ReplaceRequest):
    return replace_component(project_id, req)


class BulkReplaceRequest(BaseModel):
    category: str
    asset_id: Optional[str] = None
    fit_mode: str = "crop"
    volume: float = 1.0


@router.post("/projects/{project_id}/bulk-replace", response_model=List[ComponentItem])
def bulk_replace(project_id: str, req: BulkReplaceRequest):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    asset = make_edit_storage.get_asset(req.asset_id) if req.asset_id else None
    updated = bulk_replace_category(
        manifest=project.manifest,
        category=req.category,
        asset=asset,
        fit_mode=req.fit_mode,
        volume=req.volume,
    )
    make_edit_storage.save_project(project)
    return updated


# --- Smart Matching ---

class MatchAssetsRequest(BaseModel):
    asset_id: str
    top_k: int = 5


@router.post("/projects/{project_id}/match-assets", response_model=List[MatchSuggestion])
def match_assets_to_components(project_id: str, req: MatchAssetsRequest):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    asset = make_edit_storage.get_asset(req.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found in library")

    return suggest_component_matches(asset, project.manifest, top_k=req.top_k)


# --- Asset Library Endpoints ---

@router.post("/projects/{project_id}/assets", response_model=AssetLibraryItem)
async def upload_asset_to_library(
    project_id: str,
    file: UploadFile = File(...),
    media_type: str = Form("video"),
    tags: str = Form(""),
):
    ext = Path(file.filename or "").suffix.lower()
    asset_id = f"ast_{uuid.uuid4().hex[:10]}"
    safe_name = f"{asset_id}{ext}"
    target_path = make_edit_storage.assets_dir / safe_name

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    # Probe duration and resolution if video or image
    dur = None
    width = None
    height = None
    aspect_str = None

    if media_type in ["video", "image", "audio"]:
        try:
            import cv2
            if media_type == "video":
                cap = cv2.VideoCapture(str(target_path))
                if cap.isOpened():
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps_val = float(cap.get(cv2.CAP_PROP_FPS)) or 24.0
                    frames = float(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    dur = round(frames / fps_val, 2) if fps_val > 0 else 0.0
                    aspect_str = f"{width}:{height}"
                    cap.release()
            elif media_type == "image":
                img = cv2.imread(str(target_path))
                if img is not None:
                    height, width = img.shape[:2]
                    aspect_str = f"{width}:{height}"
            elif media_type == "audio":
                import soundfile as sf
                info = sf.info(str(target_path))
                dur = round(info.duration, 2)
        except Exception:
            pass

    size_mb = round(target_path.stat().st_size / (1024 * 1024), 2)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    asset = AssetLibraryItem(
        id=asset_id,
        name=file.filename or "Uploaded Asset",
        media_type=media_type,  # type: ignore
        file_path=str(target_path.resolve()),
        file_url=f"/api/make-edit/media/asset/{safe_name}",
        file_size_mb=size_mb,
        duration_sec=dur,
        width=width,
        height=height,
        aspect_ratio=aspect_str,
        tags=tag_list,
    )
    make_edit_storage.save_asset(asset)
    return asset


@router.post("/assets/upload", response_model=AssetLibraryItem)
async def upload_asset_direct(
    file: UploadFile = File(...),
    media_type: str = Form("video"),
    tags: str = Form(""),
):
    ext = Path(file.filename or "").suffix.lower()
    asset_id = f"ast_{uuid.uuid4().hex[:10]}"
    safe_name = f"{asset_id}{ext}"
    target_path = make_edit_storage.assets_dir / safe_name

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    dur = None
    width = None
    height = None
    aspect_str = None

    try:
        import cv2
        if media_type == "video":
            cap = cv2.VideoCapture(str(target_path))
            if cap.isOpened():
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps_val = float(cap.get(cv2.CAP_PROP_FPS)) or 24.0
                frames = float(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                dur = round(frames / fps_val, 2) if fps_val > 0 else 0.0
                aspect_str = f"{width}:{height}"
                cap.release()
        elif media_type == "image":
            img = cv2.imread(str(target_path))
            if img is not None:
                height, width = img.shape[:2]
                aspect_str = f"{width}:{height}"
        elif media_type == "audio":
            import soundfile as sf
            info = sf.info(str(target_path))
            dur = round(info.duration, 2)
    except Exception:
        pass

    size_mb = round(target_path.stat().st_size / (1024 * 1024), 2)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    asset = AssetLibraryItem(
        id=asset_id,
        name=file.filename or "Uploaded Asset",
        media_type=media_type,  # type: ignore
        file_path=str(target_path.resolve()),
        file_url=f"/api/make-edit/media/asset/{safe_name}",
        file_size_mb=size_mb,
        duration_sec=dur,
        width=width,
        height=height,
        aspect_ratio=aspect_str,
        tags=tag_list,
    )
    make_edit_storage.save_asset(asset)
    return asset


@router.get("/assets", response_model=List[AssetLibraryItem])
def list_all_assets(media_type: Optional[str] = None):
    return make_edit_storage.list_assets(media_type=media_type)


@router.delete("/assets/{asset_id}")
def delete_asset_endpoint(asset_id: str):
    asset = make_edit_storage.get_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    try:
        p = Path(asset.file_path)
        if p.exists():
            p.unlink(missing_ok=True)
    except Exception:
        pass
    make_edit_storage.delete_asset(asset_id)
    return {"status": "deleted", "id": asset_id}


@router.get("/projects/{project_id}/assets", response_model=List[AssetLibraryItem])
def list_project_assets(project_id: str, media_type: Optional[str] = None):
    return make_edit_storage.list_assets(media_type=media_type)


# --- Timeline Interchange (OpenCut & OTIO) ---

@router.get("/projects/{project_id}/timeline")
def get_timeline_opencut_format(project_id: str):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return manifest_to_opencut_format(project.manifest)


@router.get("/projects/{project_id}/export-otio")
def export_make_edit_otio(project_id: str):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pdir = make_edit_storage.get_project_dir(project_id)
    target = pdir / "exports" / f"{project.name.replace(' ', '_')}.otio"
    manifest_to_otio_format(project.manifest, target)

    return FileResponse(str(target), filename=target.name, media_type="application/json")


# --- Versioning ---

class CreateVersionRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.post("/projects/{project_id}/versions")
def save_new_version(project_id: str, req: CreateVersionRequest):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    version = create_project_version(project, name=req.name, description=req.description)
    make_edit_storage.save_project(project)
    return version


@router.post("/projects/{project_id}/versions/{version_num}/restore")
def restore_version(project_id: str, version_num: int):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    restored = restore_project_version(project, version_number=version_num)
    make_edit_storage.save_project(restored)
    return restored


# --- Preview & Final Render ---

class RenderRequest(BaseModel):
    preset: str = "16:9"  # "16:9" | "9:16" | "1:1"
    quality: str = "medium"  # "high" | "medium" | "fast_draft"


@router.post("/projects/{project_id}/render", response_model=RenderJob)
def start_render_job(project_id: str, req: RenderRequest):
    project = make_edit_storage.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    job_id = f"job_rnd_{uuid.uuid4().hex[:10]}"
    pdir = make_edit_storage.get_project_dir(project_id)
    out_file = pdir / "renders" / f"{job_id}_{req.preset.replace(':', 'x')}.mp4"

    job = RenderJob(
        id=job_id,
        project_id=project_id,
        status="rendering",
        progress=10,
        stage="Encoding with FFmpeg CPU",
        settings={"preset": req.preset, "quality": req.quality},
        output_url=f"/api/make-edit/media/render/{project_id}/{out_file.name}",
        output_filepath=str(out_file.resolve()),
    )
    RENDER_JOBS[job_id] = job

    # Render synchronously or in worker
    def progress_cb(pct: int, msg: str):
        job.progress = pct
        job.stage = msg
        job.logs.append(msg)

    try:
        render_customized_timeline(
            manifest=project.manifest,
            output_filepath=out_file,
            preset=req.preset,
            quality=req.quality,
            progress_callback=progress_cb,
        )
        job.status = "completed"
        job.progress = 100
        job.stage = "Finished"
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)

    return job


@router.get("/jobs/{job_id}", response_model=RenderJob)
def get_render_job(job_id: str):
    job = RENDER_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")
    return job


# --- Media Streaming ---

@router.get("/media/asset/{filename}")
def stream_asset_media(filename: str):
    file_path = make_edit_storage.assets_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")
    ext = file_path.suffix.lower()
    media_type = "video/mp4" if ext in [".mp4", ".mov", ".mkv"] else "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
    return FileResponse(str(file_path), media_type=media_type)


@router.get("/media/render/{project_id}/{filename}")
def stream_render_media(project_id: str, filename: str):
    file_path = make_edit_storage.get_project_dir(project_id) / "renders" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Rendered video not found")
    return FileResponse(str(file_path), media_type="video/mp4")


@router.get("/media")
def stream_media_by_path(path: str = Query(..., description="Absolute or relative path to media")):
    p = Path(path).resolve()
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")
    ext = p.suffix.lower()
    media_type = "video/mp4" if ext in [".mp4", ".mov", ".mkv"] else "audio/wav" if ext in [".wav", ".mp3"] else "image/png" if ext == ".png" else "image/jpeg"
    return FileResponse(str(p), media_type=media_type)
