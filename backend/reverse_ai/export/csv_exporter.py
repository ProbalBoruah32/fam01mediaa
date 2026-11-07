"""
FAMONEMEDIA Reverse AI - CSV Clip Inventory Exporter
Exports spreadsheet containing clip IDs, timestamps, shot types,
camera movements, dominant color looks, text overlays, and audio sync scores.
"""

from __future__ import annotations
import csv
from pathlib import Path
from backend.reverse_ai.reconstruction.models import UnifiedTimeline


def export_to_csv(timeline: UnifiedTimeline, output_filepath: str | Path) -> str:
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    headers = [
        "Index",
        "Clip ID",
        "Start Frame",
        "End Frame",
        "Start Time (s)",
        "End Time (s)",
        "Duration (s)",
        "Shot Type",
        "Camera Motion",
        "Color Look",
        "Speed Factor",
        "Transition In",
        "On-Screen Text",
        "Repeated Footage",
        "Beat Sync Score",
        "Boundary Confidence",
    ]

    rows = []
    for c in timeline.clips:
        text_str = "; ".join(f"[{t.category}] {t.text}" for t in c.text_overlays)
        rows.append([
            c.index,
            c.id,
            c.start_frame,
            c.end_frame,
            f"{c.start_time:.3f}",
            f"{c.end_time:.3f}",
            f"{c.duration:.3f}",
            c.visual_summary.shot_type,
            c.camera_motion.primary_motion,
            c.color_profile.estimated_look,
            f"{c.speed_estimation.speed_factor}x",
            c.transition_in,
            text_str,
            "YES" if c.is_repeated_footage else "NO",
            f"{c.beat_alignment_score:.2f}",
            f"{c.boundary_confidence:.2f}",
        ])

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    return str(out_path.resolve())
