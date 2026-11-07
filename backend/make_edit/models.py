"""
FAMONEMEDIA Make Your Edit - Domain Models & Component Schemas
Independent domain models representing editable components, versioned manifests,
user media assets, replacement rules, compatibility diagnostics, and render jobs.
"""

from __future__ import annotations
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


ComponentCategory = Literal[
    "video_clip",
    "image_graphic",
    "text_component",
    "audio_component",
    "transition",
    "effect",
    "timeline_metadata",
]

ComponentSubtype = Literal[
    # Video
    "cut_scene",
    "repeated_footage",
    "b_roll",
    # Image / Graphics
    "logo_overlay",
    "watermark",
    "graphic_sticker",
    # Text
    "title_text",
    "subtitle_text",
    "lower_third_text",
    "credit_text",
    "general_caption",
    # Audio
    "speech_dialogue",
    "background_music",
    "beat_grid",
    "ambient_audio",
    # Transition
    "hard_cut",
    "cross_dissolve",
    "fade_black",
    "fade_white",
    "directional_wipe",
    # Effects
    "camera_pan",
    "camera_tilt",
    "camera_zoom",
    "camera_shake",
    "speed_change",
    "color_treatment",
    # Metadata
    "stream_container",
]

ComponentStatus = Literal["original", "replaced", "locked", "uncertain", "removed"]

FitMode = Literal["fit", "crop", "stretch", "loop", "keep_original"]


class ReplacementData(BaseModel):
    asset_id: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[Literal["video", "image", "audio", "font"]] = None
    original_filename: Optional[str] = None
    
    # Text replacement
    replacement_text: Optional[str] = None
    font_family: Optional[str] = None
    font_size: Optional[int] = None
    font_color: Optional[str] = None
    
    # Timing & Transforms
    trim_in: float = 0.0
    trim_out: Optional[float] = None
    playback_speed: float = 1.0
    volume: float = 1.0
    opacity: float = 1.0
    fit_mode: FitMode = "crop"
    applied_at: Optional[str] = None


class CompatibilityWarning(BaseModel):
    code: str
    severity: Literal["warning", "error", "info"] = "warning"
    message: str
    suggested_action: str


class ComponentItem(BaseModel):
    id: str  # Stable unique ID, e.g. "cmp_vid_001", "cmp_txt_002"
    category: ComponentCategory
    subtype: ComponentSubtype
    title: str
    description: str
    
    # Timeline geometry
    start_time: float
    end_time: float
    duration: float
    track_id: str
    
    # Visual / Reference
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    
    # Status & Flags
    status: ComponentStatus = "original"
    is_replaceable: bool = True
    is_editable: bool = True
    is_locked: bool = False
    is_uncertain: bool = False
    is_inferred: bool = False  # True for camera motion/color looks; False for cuts/OCR/speech
    
    # Confidence & Audit Trail
    confidence: float = 1.0
    evidence: str = ""
    source_timestamp: float = 0.0
    original_asset_ref: Optional[str] = None
    compatible_replacement_types: List[Literal["video", "image", "audio", "text"]] = Field(default_factory=list)
    
    # Intrinsic parameters (detected from original)
    intrinsic_properties: Dict[str, Any] = Field(default_factory=dict)
    
    # Replacement state (null if using original)
    replacement: Optional[ReplacementData] = None
    
    # Diagnostics & Warnings
    warnings: List[CompatibilityWarning] = Field(default_factory=list)


class AssetLibraryItem(BaseModel):
    id: str
    name: str
    media_type: Literal["video", "image", "audio", "font"]
    file_path: str
    file_url: str
    file_size_mb: float
    duration_sec: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None
    channels: Optional[int] = None
    sample_rate: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ComponentManifest(BaseModel):
    manifest_version: str = "1.0.0"
    project_id: str
    source_reverse_ai_project_id: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Timeline specs
    fps: float = 24.0
    width: int = 1920
    height: int = 1080
    aspect_ratio: str = "16:9"
    total_duration_sec: float = 0.0
    total_components_count: int = 0
    
    # Category counts for library badges
    category_counts: Dict[str, int] = Field(default_factory=dict)
    
    # All components ordered sequentially
    components: List[ComponentItem] = Field(default_factory=list)


class ProjectVersion(BaseModel):
    version_id: str
    version_number: int
    name: str
    description: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    manifest_snapshot: ComponentManifest
    replaced_count: int = 0


class MakeEditProject(BaseModel):
    id: str
    name: str
    reverse_ai_project_id: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Current active manifest
    manifest: ComponentManifest
    
    # Version snapshots for undo/redo/history
    active_version_number: int = 1
    versions: List[ProjectVersion] = Field(default_factory=list)


class MatchSuggestion(BaseModel):
    component_id: str
    component_title: str
    component_category: ComponentCategory
    asset_id: str
    asset_name: str
    match_score: float  # 0.0 to 1.0
    reasons: List[str]
    compatibility_warnings: List[CompatibilityWarning] = Field(default_factory=list)


class RenderJob(BaseModel):
    id: str
    project_id: str
    status: Literal["pending", "rendering", "completed", "failed", "cancelled"] = "pending"
    progress: int = 0  # 0 to 100
    stage: str = "Initialized"
    output_url: Optional[str] = None
    output_filepath: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)
    logs: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
