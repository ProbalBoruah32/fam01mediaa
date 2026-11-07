"""
FAMONEMEDIA Reverse AI - Native JSON Exporter
Exports complete high-fidelity domain timeline with all metadata, tracks, and evidence logs.
"""

from __future__ import annotations
import json
from pathlib import Path
from backend.reverse_ai.reconstruction.models import UnifiedTimeline


def export_to_json(timeline: UnifiedTimeline, output_filepath: str | Path) -> str:
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(timeline.model_dump(), f, indent=2, ensure_ascii=False)

    return str(out_path.resolve())
