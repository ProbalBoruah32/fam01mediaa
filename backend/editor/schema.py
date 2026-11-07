"""
FAMONEMEDIA Canonical Editor Schema Specification - V1
Defines standard domain models for multitrack timeline projects, keyframes,
effects, transitions, text overlays, and interchange serialization.
"""

from __future__ import annotations
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


AspectRatioPreset = Literal["16:9", "9:16", "1:1", "4:5", "21:9", "custom"]
MediaType = Literal["video", "image", "audio", "text"]
TrackType = Literal["video", "overlay", "text", "audio"]
EasingType = Literal["linear", "ease_in", "ease_out", "ease_in_out", "bezier"]


class ClipKeyframeV1(BaseModel):
    time_offset: float      # Seconds from clip start
    property: Literal["scale", "x", "y", "rotation", "opacity", "volume"]
    value: float
    easing: EasingType = "linear"


class ClipTransformV1(BaseModel):
    x: float = 0.0          # Pixel offset X
    y: float = 0.0          # Pixel offset Y
    scale: float = 1.0      # Scale multiplier (0.1 to 5.0)
    rotation: float = 0.0   # Rotation in degrees
    opacity: float = 1.0    # 0.0 to 1.0


class TextPropertiesV1(BaseModel):
    text: str = "Headline Title"
    font_family: str = "Arial"
    font_size: int = 48
    font_color: str = "#ffffff"
    background_color: Optional[str] = None
    alignment: Literal["left", "center", "right"] = "center"
    is_animated: bool = False
    animation_preset: Optional[str] = None


class ClipEffectV1(BaseModel):
    id: str
    type: Literal["blur", "gaussian_blur", "glow", "glitch", "rgb_split", "film_grain", "vignette", "sharpen"]
    intensity: float = 0.5
    is_enabled: bool = True


class EditorClipV1(BaseModel):
    id: str
    track_id: str
    name: str
    media_type: MediaType
    file_path: Optional[str] = None
    media_url: Optional[str] = None
    
    # Timeline geometry
    start_time: float       # Position on master timeline in seconds
    duration: float         # Active duration on timeline
    trim_in: float = 0.0    # Offset into source file
    trim_out: Optional[float] = None
    
    # Playback & Audio
    speed: float = 1.0      # Playback factor (0.1 to 100.0)
    volume: float = 1.0     # Audio gain (0.0 to 5.0)
    is_muted: bool = False
    
    # Visual transforms & Keyframes
    transform: ClipTransformV1 = Field(default_factory=ClipTransformV1)
    keyframes: List[ClipKeyframeV1] = Field(default_factory=list)
    text_properties: Optional[TextPropertiesV1] = None
    effects: List[ClipEffectV1] = Field(default_factory=list)


class EditorTransitionV1(BaseModel):
    id: str
    from_clip_id: str
    to_clip_id: str
    type: Literal["cross_dissolve", "fade_black", "fade_white", "wipe_left", "wipe_right", "slide_left"] = "cross_dissolve"
    duration: float = 0.5


class TimelineMarkerV1(BaseModel):
    time: float
    label: str
    color: str = "#00f2fe"


class EditorTrackV1(BaseModel):
    id: str
    name: str
    type: TrackType
    order: int
    is_muted: bool = False
    is_locked: bool = False
    clips: List[EditorClipV1] = Field(default_factory=list)


class FamonemediaEditorProjectV1(BaseModel):
    version: str = "1.0.0"
    id: str
    name: str = "New Creative Project"
    aspect_ratio: AspectRatioPreset = "16:9"
    width: int = 1920
    height: int = 1080
    fps: float = 30.0
    total_duration_sec: float = 0.0
    tracks: List[EditorTrackV1] = Field(default_factory=list)
    transitions: List[EditorTransitionV1] = Field(default_factory=list)
    markers: List[TimelineMarkerV1] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
