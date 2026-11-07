"""
FAMONEMEDIA Reverse AI - Timeline Retrieval & Manual Correction API
Serves the unified multitrack timeline and allows manual adjustment of clip boundaries and inferred tags.
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from backend.reverse_ai.reconstruction.models import UnifiedTimeline, ClipItem
from backend.reverse_ai.jobs.storage import storage_manager
from backend.reverse_ai.reconstruction.timeline_builder import build_unified_timeline

router = APIRouter(prefix="/api/projects", tags=["Timeline"])


class ClipUpdateRequest(BaseModel):
    id: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    start_frame: Optional[int] = None
    end_frame: Optional[int] = None
    transition_in: Optional[str] = None
    transition_out: Optional[str] = None
    primary_motion: Optional[str] = None
    shot_type: Optional[str] = None
    estimated_look: Optional[str] = None


class PatchTimelineRequest(BaseModel):
    clips: Optional[List[ClipUpdateRequest]] = None


@router.get("/{project_id}/timeline", response_model=UnifiedTimeline)
def get_timeline(project_id: str):
    project = storage_manager.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.timeline:
        raise HTTPException(status_code=404, detail="Timeline has not been generated for this project yet")
    return project.timeline


@router.patch("/{project_id}/timeline", response_model=UnifiedTimeline)
def patch_timeline(project_id: str, patch_data: PatchTimelineRequest):
    project = storage_manager.load_project(project_id)
    if not project or not project.timeline:
        raise HTTPException(status_code=404, detail="Project or timeline not found")

    timeline = project.timeline

    if patch_data.clips:
        clip_map = {c.id: c for c in timeline.clips}
        fps = timeline.fps

        for patch in patch_data.clips:
            if patch.id in clip_map:
                target = clip_map[patch.id]
                target.user_modified = True

                if patch.start_time is not None:
                    target.start_time = round(patch.start_time, 3)
                    target.start_frame = int(round(patch.start_time * fps))
                if patch.end_time is not None:
                    target.end_time = round(patch.end_time, 3)
                    target.end_frame = int(round(patch.end_time * fps))
                if target.end_time > target.start_time:
                    target.duration = round(target.end_time - target.start_time, 3)

                if patch.transition_in is not None:
                    target.transition_in = patch.transition_in  # type: ignore
                if patch.transition_out is not None:
                    target.transition_out = patch.transition_out  # type: ignore
                if patch.primary_motion is not None:
                    target.camera_motion.primary_motion = patch.primary_motion  # type: ignore
                if patch.shot_type is not None:
                    target.visual_summary.shot_type = patch.shot_type  # type: ignore
                if patch.estimated_look is not None:
                    target.color_profile.estimated_look = patch.estimated_look

        # Rebuild multitrack representation with updated clips
        updated_timeline = build_unified_timeline(
            project_id=project_id,
            metadata=timeline.video_metadata,
            clips=timeline.clips,
            audio_summary=timeline.audio_analysis,
            transcript=timeline.transcript,
        )
        project.timeline = updated_timeline
        storage_manager.save_project(project)
        return updated_timeline

    return timeline
