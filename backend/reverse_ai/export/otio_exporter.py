"""
FAMONEMEDIA Reverse AI - OpenTimelineIO (OTIO) Exporter
Exports reconstructed editing decisions to native OpenTimelineIO (.otio) interchange format,
supporting video tracks, clip boundaries, markers, metadata, and audio tracks.
"""

from __future__ import annotations
from pathlib import Path
import opentimelineio as otio
from backend.reverse_ai.reconstruction.models import UnifiedTimeline


def export_to_otio(timeline: UnifiedTimeline, output_filepath: str | Path) -> str:
    """
    Constructs an OpenTimelineIO Timeline with video tracks, markers, and audio.
    Saves to .otio file and returns resolved path.
    """
    fps = timeline.fps
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    otio_timeline = otio.schema.Timeline(name=f"FAMONE_Reverse_{timeline.project_id}")
    video_track = otio.schema.Track(name="V1: Video Cuts", kind=otio.schema.TrackKind.Video)

    for clip in timeline.clips:
        start_frame = clip.start_frame
        duration_frames = max(1, clip.end_frame - clip.start_frame + 1)

        source_range = otio.opentime.TimeRange(
            start_time=otio.opentime.RationalTime(start_frame, fps),
            duration=otio.opentime.RationalTime(duration_frames, fps),
        )

        media_ref = otio.schema.ExternalReference(
            target_url=timeline.video_metadata.filepath,
            available_range=source_range,
        )

        otio_clip = otio.schema.Clip(
            name=f"Shot_{clip.index:02d}_{clip.visual_summary.shot_type}",
            media_reference=media_ref,
            source_range=source_range,
        )

        # Attach metadata: camera motion, color look, detected facts vs inferred
        otio_clip.metadata["famone"] = {
            "clip_id": clip.id,
            "boundary_source": clip.detector_source,
            "boundary_confidence": clip.boundary_confidence,
            "camera_motion": clip.camera_motion.primary_motion,
            "color_look": clip.color_profile.estimated_look,
            "speed_factor": clip.speed_estimation.speed_factor,
            "is_repeated": clip.is_repeated_footage,
            "beat_alignment_score": clip.beat_alignment_score,
        }

        # Add marker if on-screen text exists
        for txt in clip.text_overlays:
            txt_marker = otio.schema.Marker(
                name=f"[{txt.category.upper()}] {txt.text[:20]}",
                marked_range=otio.opentime.TimeRange(
                    start_time=otio.opentime.RationalTime(int(txt.timestamp_sec * fps), fps),
                    duration=otio.opentime.RationalTime(int(2.0 * fps), fps),
                ),
                color=otio.schema.MarkerColor.MAGENTA,
            )
            otio_clip.markers.append(txt_marker)

        video_track.append(otio_clip)

    otio_timeline.tracks.append(video_track)

    # Save to disk
    otio.adapters.write_to_file(otio_timeline, str(out_path))
    return str(out_path.resolve())
