"""
FAMONEMEDIA CapCut + Shotcut Combined Editor Engine - Domain Models
Represents multitrack timeline geometry, keyframe animation, color grading,
chroma key (green screen), speed controls, transitions, transforms, text overlays,
timeline markers, and Shotcut MLT XML export specifications.
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


AspectRatioPreset = Literal["16:9", "9:16", "1:1", "4:5", "21:9", "custom"]
MediaType = Literal["video", "image", "audio", "text"]
TrackType = Literal["video", "audio", "text", "overlay"]
EasingType = Literal["linear", "ease_in", "ease_out", "ease_in_out", "bezier"]


class ClipKeyframe(BaseModel):
    id: str = Field(default_factory=lambda: f"kf_{datetime.utcnow().timestamp()}")
    time_offset: float          # Seconds from clip start
    property: Literal["scale", "x", "y", "rotation", "opacity", "volume"]
    value: float
    easing: EasingType = "linear"


class ClipTransform(BaseModel):
    x: float = 0.0              # Normalized position X (-1.0 to 1.0 or pixel offset)
    y: float = 0.0              # Normalized position Y
    scale: float = 1.0          # Scale factor (0.1 to 5.0)
    rotation: float = 0.0       # Degrees
    opacity: float = 1.0        # 0.0 to 1.0


class ColorAdjustments(BaseModel):
    brightness: float = 0.0     # -100 to +100 (or -1.0 to 1.0)
    contrast: float = 1.0       # 0.1 to 3.0 (1.0 = default)
    saturation: float = 1.0     # 0.0 to 3.0 (1.0 = default)
    temperature: float = 0.0    # -100 to +100 (Cool to Warm)
    tint: float = 0.0           # -100 to +100 (Green to Magenta)
    exposure: float = 0.0       # -2.0 to 2.0
    sharpen: float = 0.0        # 0.0 to 1.0
    vignette: float = 0.0       # 0.0 to 1.0


class ChromaKeySettings(BaseModel):
    enabled: bool = False
    target_color: str = "#00ff00" # Green screen default
    similarity: float = 0.4     # 0.0 to 1.0
    smoothness: float = 0.1     # 0.0 to 1.0
    spill: float = 0.1          # 0.0 to 1.0


class ClipAudioSettings(BaseModel):
    volume: float = 1.0         # Audio gain (0.0 to 5.0)
    fade_in: float = 0.0        # Seconds
    fade_out: float = 0.0       # Seconds
    is_muted: bool = False
    pitch_preserved: bool = True


class TextProperties(BaseModel):
    text: str = "Headline Title"
    font_family: str = "Arial"
    font_size: int = 48
    font_color: str = "#ffffff"
    background_color: Optional[str] = None
    alignment: Literal["left", "center", "right"] = "center"
    outline_color: Optional[str] = None
    outline_width: int = 0
    shadow_color: Optional[str] = None
    shadow_blur: int = 0
    animation: Optional[str] = None # "typewriter" | "fade" | "karaoke" | "bounce"


class ClipEffect(BaseModel):
    id: str
    type: Literal["blur", "gaussian_blur", "glow", "glitch", "rgb_split", "film_grain", "vignette", "sharpen"]
    intensity: float = 0.5
    is_enabled: bool = True


class EditorClip(BaseModel):
    id: str
    track_id: str
    name: str
    media_type: MediaType
    file_path: Optional[str] = None
    media_url: Optional[str] = None
    
    # Timeline Placement
    start_time: float           # Position on master timeline in seconds
    duration: float             # Active duration on timeline in seconds
    trim_in: float = 0.0        # Offset into source media in seconds
    trim_out: Optional[float] = None
    
    # Playback & Speed
    speed: float = 1.0          # Playback rate factor (0.1 to 100.0)
    is_reversed: bool = False   # Reverse playback
    
    # Audio Settings
    volume: float = 1.0         # Audio gain (0.0 to 5.0)
    is_muted: bool = False
    audio_settings: ClipAudioSettings = Field(default_factory=ClipAudioSettings)
    
    # Visual Transform & Keyframing
    transform: ClipTransform = Field(default_factory=ClipTransform)
    keyframes: List[ClipKeyframe] = Field(default_factory=list)
    
    # Color Correction & Chroma Key
    color_adjustments: ColorAdjustments = Field(default_factory=ColorAdjustments)
    chroma_key: ChromaKeySettings = Field(default_factory=ChromaKeySettings)
    
    # Text & Effects
    text_properties: Optional[TextProperties] = None
    effects: List[ClipEffect] = Field(default_factory=list)


class EditorTransition(BaseModel):
    id: str
    from_clip_id: str
    to_clip_id: str
    type: Literal["cross_dissolve", "fade_black", "fade_white", "wipe_left", "wipe_right", "slide_left", "zoom_in", "glitch"] = "cross_dissolve"
    duration: float = 0.5


class TimelineMarker(BaseModel):
    id: str
    time: float
    label: str = "Cue"
    color: str = "#00f2fe"


class EditorTrack(BaseModel):
    id: str
    name: str
    type: TrackType
    order: int
    is_muted: bool = False
    is_locked: bool = False
    clips: List[EditorClip] = Field(default_factory=list)


class EditorProject(BaseModel):
    id: str
    name: str = "New Creative Project"
    aspect_ratio: AspectRatioPreset = "16:9"
    width: int = 1920
    height: int = 1080
    fps: float = 30.0
    total_duration_sec: float = 0.0
    tracks: List[EditorTrack] = Field(default_factory=list)
    transitions: List[EditorTransition] = Field(default_factory=list)
    markers: List[TimelineMarker] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ShotcutExportPackage(BaseModel):
    project_id: str
    project_name: str
    mlt_filename: str
    zip_filename: str
    mlt_download_url: str
    zip_download_url: str
    file_size_bytes: int
    total_media_files: int
    instructions: List[str]
