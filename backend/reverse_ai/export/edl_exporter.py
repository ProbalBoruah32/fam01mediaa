"""
FAMONEMEDIA Reverse AI - CMX 3600 EDL Exporter
Generates standard Edit Decision Lists (.edl) compatible with DaVinci Resolve,
Adobe Premiere Pro, and Final Cut Pro.
"""

from __future__ import annotations
from pathlib import Path
from backend.reverse_ai.reconstruction.models import UnifiedTimeline


def frames_to_smpte(frame_num: int, fps: float) -> str:
    """Converts a frame number to standard SMPTE timecode (HH:MM:SS:FF)."""
    int_fps = int(round(fps)) if fps > 0 else 30
    total_sec = frame_num // int_fps
    rem_frames = frame_num % int_fps

    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    seconds = total_sec % 60

    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{rem_frames:02d}"


def export_to_edl(timeline: UnifiedTimeline, output_filepath: str | Path) -> str:
    """
    Exports timeline cuts to CMX 3600 format with comment annotations.
    """
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fps = timeline.fps

    lines = [
        f"TITLE: FAMONE_REVERSE_{timeline.project_id.upper()}",
        "FCM: NON-DROP FRAME",
        "",
    ]

    record_in_frame = 0

    for idx, clip in enumerate(timeline.clips):
        event_num = f"{idx + 1:03d}"
        source_in = clip.start_frame
        source_out = clip.end_frame + 1
        clip_dur_frames = max(1, source_out - source_in)

        record_out_frame = record_in_frame + clip_dur_frames

        src_in_tc = frames_to_smpte(source_in, fps)
        src_out_tc = frames_to_smpte(source_out, fps)
        rec_in_tc = frames_to_smpte(record_in_frame, fps)
        rec_out_tc = frames_to_smpte(record_out_frame, fps)

        # CMX 3600 standard cut line: [EVENT] [REEL] [TRACK] [TRANSITION] [SRC_IN] [SRC_OUT] [REC_IN] [REC_OUT]
        lines.append(f"{event_num}  AX       V     C        {src_in_tc} {src_out_tc} {rec_in_tc} {rec_out_tc}")
        lines.append(f"* FROM CLIP NAME: {timeline.video_metadata.filename} (Shot {clip.index})")
        lines.append(f"* SHOT TYPE: {clip.visual_summary.shot_type.upper()}")
        lines.append(f"* CAMERA MOTION: {clip.camera_motion.primary_motion.upper()}")
        lines.append(f"* COLOR LOOK: {clip.color_profile.estimated_look}")
        if clip.text_overlays:
            texts = "; ".join(f"[{t.category}] {t.text}" for t in clip.text_overlays[:2])
            lines.append(f"* TEXT OVERLAY: {texts}")
        lines.append("")

        record_in_frame = record_out_frame

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return str(out_path.resolve())
