"""
FAMONEMEDIA Reverse AI - SubRip (SRT) Subtitle Exporter
Formats speech transcripts into standard .srt subtitle files.
"""

from __future__ import annotations
from pathlib import Path
from typing import List
from backend.reverse_ai.reconstruction.models import SubtitleLine


def seconds_to_srt_timestamp(seconds: float) -> str:
    """Converts seconds float to HH:MM:SS,mmm format."""
    total_ms = int(round(seconds * 1000))
    ms = total_ms % 1000
    total_sec = total_ms // 1000
    s = total_sec % 60
    total_min = total_sec // 60
    m = total_min % 60
    h = total_min // 60
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def export_to_srt(transcript: List[SubtitleLine], output_filepath: str | Path) -> str:
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    lines = []
    if not transcript:
        # Valid placeholder SubRip for purely instrumental/non-speech tracks
        lines.append("1")
        lines.append("00:00:00,000 --> 00:00:02,000")
        lines.append("[No spoken dialogue detected / Instrumental Audio]")
        lines.append("")
    else:
        for idx, sub in enumerate(transcript):
            lines.append(str(idx + 1))
            lines.append(f"{seconds_to_srt_timestamp(sub.start_sec)} --> {seconds_to_srt_timestamp(sub.end_sec)}")
            lines.append(sub.text)
            lines.append("")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return str(out_path.resolve())
