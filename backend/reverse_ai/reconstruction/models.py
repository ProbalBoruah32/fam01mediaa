"""
FAMONEMEDIA Reverse AI - Domain Models
Full Pydantic schemas representing projects, video streams, clips,
motion/visual/audio/text events, unified multitrack timeline, and job states.
"""

from __future__ import annotations
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class VideoMetadata(BaseModel):
    filename: str
    filepath: str
    duration_sec: float
    total_frames: int
    fps: float
    width: int
    height: int
    aspect_ratio: str
    codec: str
    bitrate_kbps: Optional[float] = None
    file_size_mb: float
    has_audio: bool
    audio_codec: Optional[str] = None
    audio_sample_rate: Optional[int] = None
    audio_channels: Optional[int] = None


class CameraMotion(BaseModel):
    primary_motion: Literal[
        "static",
        "pan_left",
        "pan_right",
        "tilt_up",
        "tilt_down",
        "zoom_in",
        "zoom_out",
        "handheld",
        "complex_movement",
    ] = "static"
    motion_magnitude: float = 0.0  # Average pixels/frame
    pan_score: float = 0.0
    tilt_score: float = 0.0
    zoom_score: float = 0.0
    confidence: float = 1.0
    is_inferred: bool = True
    evidence: str = "Optical flow vector analysis"


class SpeedEstimation(BaseModel):
    speed_factor: float = 1.0  # 1.0 = normal, 0.5 = 2x slow-mo, 2.0 = 2x speed-up
    label: Literal["normal", "slow_motion", "speed_ramp_up", "hyperlapse"] = "normal"
    motion_variance: float = 0.0
    confidence: float = 0.75
    is_inferred: bool = True
    evidence: str = "Inter-frame motion flow consistency"


class ColorProfile(BaseModel):
    dominant_palette_hex: List[str] = Field(default_factory=list)
    temperature: Literal["warm", "cool", "neutral"] = "neutral"
    saturation_level: Literal["monochrome", "muted", "natural", "vibrant", "stylized"] = "natural"
    contrast_ratio: float = 1.0
    mean_brightness: float = 128.0
    estimated_look: str = "Standard Rec.709"
    confidence: float = 0.85
    is_inferred: bool = True


class VisualSummary(BaseModel):
    description: str = ""
    shot_type: Literal[
        "extreme_wide",
        "wide",
        "medium",
        "medium_close_up",
        "close_up",
        "extreme_close_up",
        "unknown",
    ] = "medium"
    subject_category: str = "general"
    lighting_style: str = "natural"
    composition_notes: str = ""
    model_used: str = "qwen2.5-vl-3b"  # or "cv_heuristic_engine"
    confidence: float = 0.8
    is_inferred: bool = True


class TextOverlay(BaseModel):
    text: str
    confidence: float
    category: Literal["title", "subtitle", "lower_third", "watermark", "credit", "other"] = "other"
    bbox_normalized: List[float] = Field(default_factory=list)  # [ymin, xmin, ymax, xmax]
    timestamp_sec: float = 0.0
    is_inferred: bool = False  # Detected fact from OCR


class AudioBeat(BaseModel):
    time_sec: float
    frame_index: int
    strength: float = 1.0
    is_downbeat: bool = False


class WordTimestamp(BaseModel):
    word: str
    start_sec: float
    end_sec: float
    probability: float = 1.0


class SubtitleLine(BaseModel):
    id: str
    start_sec: float
    end_sec: float
    text: str
    confidence: float = 1.0
    words: List[WordTimestamp] = Field(default_factory=list)
    is_inferred: bool = False  # Detected fact from speech transcription


class ClipItem(BaseModel):
    id: str
    index: int
    start_frame: int
    end_frame: int
    start_time: float
    end_time: float
    duration: float
    thumbnail_url: str
    representative_frame_url: str

    # Boundary detection facts & scores
    boundary_confidence: float = 1.0
    detector_source: str = "transnetv2+scenedetect"
    is_boundary_fact: bool = True

    # Transition effects
    transition_in: Literal["cut", "dissolve", "fade_black", "fade_white", "wipe", "none"] = "cut"
    transition_in_duration: float = 0.0
    transition_out: Literal["cut", "dissolve", "fade_black", "fade_white", "wipe", "none"] = "cut"
    transition_out_duration: float = 0.0

    # Inferred clip analyses
    camera_motion: CameraMotion = Field(default_factory=CameraMotion)
    speed_estimation: SpeedEstimation = Field(default_factory=SpeedEstimation)
    color_profile: ColorProfile = Field(default_factory=ColorProfile)
    visual_summary: VisualSummary = Field(default_factory=VisualSummary)
    text_overlays: List[TextOverlay] = Field(default_factory=list)

    # Repeated footage detection
    is_repeated_footage: bool = False
    repeated_clip_id: Optional[str] = None
    perceptual_hash: Optional[str] = None

    # Musical beat alignment
    beat_alignment_score: float = 0.0  # 1.0 = perfectly synced cut, 0.0 = off beat
    nearest_beat_delta_sec: float = 0.0

    # User edit flags
    user_modified: bool = False


class TimelineEvent(BaseModel):
    id: str
    track_id: str
    title: str
    start_time: float
    end_time: float
    duration: float
    event_type: Literal["clip", "transition", "text", "audio_speech", "motion", "color"]
    data: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
    is_inferred: bool = False
    evidence: str = ""


class TimelineTrack(BaseModel):
    id: str
    type: Literal["video", "text", "audio", "effects"]
    name: str
    color: str
    is_muted: bool = False
    is_locked: bool = False
    events: List[TimelineEvent] = Field(default_factory=list)


class AudioAnalysisSummary(BaseModel):
    has_audio: bool = False
    tempo_bpm: float = 0.0
    beat_count: int = 0
    beats: List[AudioBeat] = Field(default_factory=list)
    rms_energy_mean: float = 0.0
    speech_segments_count: int = 0


class UnifiedTimeline(BaseModel):
    project_id: str
    video_metadata: VideoMetadata
    total_duration_sec: float
    fps: float
    total_clips: int
    clips: List[ClipItem] = Field(default_factory=list)
    tracks: List[TimelineTrack] = Field(default_factory=list)
    audio_analysis: AudioAnalysisSummary = Field(default_factory=AudioAnalysisSummary)
    transcript: List[SubtitleLine] = Field(default_factory=list)

    # Statistics & Evidence
    detected_facts_count: int = 0
    inferred_effects_count: int = 0
    overall_confidence_score: float = 0.92

    # Legal / Technical Disclaimer
    disclaimer: str = (
        "FAMONEMEDIA Reverse AI reconstructs an editable approximation of editing decisions. "
        "Detected facts (cuts, on-screen text, speech timestamps) reflect direct algorithmic signals. "
        "Inferred effects (camera movement, color looks, speed factors) represent heuristic models. "
        "Flattened video cannot restore original project camera keyframes or unmerged assets."
    )
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Project(BaseModel):
    id: str
    name: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status: Literal["created", "uploading", "uploaded", "analyzing", "completed", "failed"] = "created"
    video_filename: Optional[str] = None
    video_path: Optional[str] = None
    video_metadata: Optional[VideoMetadata] = None
    timeline: Optional[UnifiedTimeline] = None
    error_message: Optional[str] = None


class JobStatus(BaseModel):
    id: str
    project_id: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"] = "pending"
    progress: int = 0  # 0 to 100
    current_stage: int = 0  # 1 to 10
    stage_name: str = "Ready"
    logs: List[str] = Field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
