"""
FAMONEMEDIA Reverse AI - Unified Multitrack Timeline Builder
Assembles detected cuts, on-screen text, speech transcripts, camera trajectories,
and audio beats into an editable 4-track timeline structure with evidence audit trails.
"""

from __future__ import annotations
from typing import List, Dict, Any
from datetime import datetime
from backend.reverse_ai.reconstruction.models import (
    VideoMetadata,
    ClipItem,
    TimelineTrack,
    TimelineEvent,
    AudioAnalysisSummary,
    SubtitleLine,
    UnifiedTimeline,
)


def build_unified_timeline(
    project_id: str,
    metadata: VideoMetadata,
    clips: List[ClipItem],
    audio_summary: AudioAnalysisSummary,
    transcript: List[SubtitleLine],
) -> UnifiedTimeline:
    """
    Fuses clip records, audio beats, speech transcriptions, and visual overlays
    into an editable multitrack timeline data structure.
    """
    # 1. Video Track (V1)
    v1_events: List[TimelineEvent] = []
    for c in clips:
        v1_events.append(
            TimelineEvent(
                id=f"evt_v_{c.id}",
                track_id="track_v1",
                title=f"Shot {c.index:02d} ({c.visual_summary.shot_type})",
                start_time=c.start_time,
                end_time=c.end_time,
                duration=c.duration,
                event_type="clip",
                data={
                    "clip_id": c.id,
                    "index": c.index,
                    "thumbnail_url": c.thumbnail_url,
                    "transition_in": c.transition_in,
                    "camera_motion": c.camera_motion.primary_motion,
                    "color_look": c.color_profile.estimated_look,
                    "shot_type": c.visual_summary.shot_type,
                    "is_repeated": c.is_repeated_footage,
                },
                confidence=c.boundary_confidence,
                is_inferred=False,
                evidence=f"Shot boundary detected via {c.detector_source}",
            )
        )

    track_v1 = TimelineTrack(
        id="track_v1",
        type="video",
        name="V1: Video Cuts",
        color="#3b82f6",  # Blue
        events=v1_events,
    )

    # 2. Text / Overlay Track (V2)
    v2_events: List[TimelineEvent] = []
    evt_text_counter = 1
    for c in clips:
        for t in c.text_overlays:
            v2_events.append(
                TimelineEvent(
                    id=f"evt_txt_{evt_text_counter:03d}",
                    track_id="track_v2",
                    title=f"[{t.category.upper()}] {t.text[:24]}",
                    start_time=t.timestamp_sec,
                    end_time=min(metadata.duration_sec, t.timestamp_sec + 2.5),
                    duration=min(metadata.duration_sec - t.timestamp_sec, 2.5),
                    event_type="text",
                    data={
                        "text": t.text,
                        "category": t.category,
                        "bbox_normalized": t.bbox_normalized,
                        "clip_id": c.id,
                    },
                    confidence=t.confidence,
                    is_inferred=False,
                    evidence="PP-OCR on-screen character recognition",
                )
            )
            evt_text_counter += 1

    track_v2 = TimelineTrack(
        id="track_v2",
        type="text",
        name="V2: Titles & Text",
        color="#f59e0b",  # Amber
        events=v2_events,
    )

    # 3. Audio & Speech Track (A1)
    a1_events: List[TimelineEvent] = []
    for s in transcript:
        a1_events.append(
            TimelineEvent(
                id=f"evt_sp_{s.id}",
                track_id="track_a1",
                title=f"Dialogue: \"{s.text[:26]}...\"",
                start_time=s.start_sec,
                end_time=s.end_sec,
                duration=round(s.end_sec - s.start_sec, 3),
                event_type="audio_speech",
                data={"full_text": s.text, "words_count": len(s.words)},
                confidence=s.confidence,
                is_inferred=False,
                evidence="Whisper neural speech transcription",
            )
        )

    track_a1 = TimelineTrack(
        id="track_a1",
        type="audio",
        name="A1: Speech & Audio",
        color="#10b981",  # Emerald
        events=a1_events,
    )

    # 4. Effects & Motion Track (FX)
    fx_events: List[TimelineEvent] = []
    for c in clips:
        if c.camera_motion.primary_motion != "static":
            fx_events.append(
                TimelineEvent(
                    id=f"evt_fx_cam_{c.id}",
                    track_id="track_fx",
                    title=f"Camera: {c.camera_motion.primary_motion.replace('_', ' ').title()}",
                    start_time=c.start_time,
                    end_time=c.end_time,
                    duration=c.duration,
                    event_type="motion",
                    data={
                        "motion": c.camera_motion.primary_motion,
                        "magnitude": c.camera_motion.motion_magnitude,
                        "speed_factor": c.speed_estimation.speed_factor,
                    },
                    confidence=c.camera_motion.confidence,
                    is_inferred=True,
                    evidence=c.camera_motion.evidence,
                )
            )

    track_fx = TimelineTrack(
        id="track_fx",
        type="effects",
        name="FX: Camera & Movement",
        color="#8b5cf6",  # Purple
        events=fx_events,
    )

    # Compute statistics
    facts_count = len(clips) + len(v2_events) + len(transcript) + len(audio_summary.beats)
    inferred_count = len(fx_events) + len(clips) * 3  # (camera, speed, color per clip)

    all_confs = [c.boundary_confidence for c in clips] + [t.confidence for t in v2_events] + [s.confidence for s in transcript]
    avg_conf = float(sum(all_confs) / len(all_confs)) if all_confs else 0.90

    return UnifiedTimeline(
        project_id=project_id,
        video_metadata=metadata,
        total_duration_sec=metadata.duration_sec,
        fps=metadata.fps,
        total_clips=len(clips),
        clips=clips,
        tracks=[track_v1, track_v2, track_a1, track_fx],
        audio_analysis=audio_summary,
        transcript=transcript,
        detected_facts_count=facts_count,
        inferred_effects_count=inferred_count,
        overall_confidence_score=round(avg_conf, 2),
    )
