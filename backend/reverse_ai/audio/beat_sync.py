"""
FAMONEMEDIA Reverse AI - Beat-to-Cut Synchronization Analyzer
Determines how closely video cut transitions align with musical beat markers.
"""

from __future__ import annotations
from typing import List, Tuple
from backend.reverse_ai.reconstruction.models import AudioBeat


def evaluate_cut_beat_alignment(
    cut_time_sec: float,
    beats: List[AudioBeat],
) -> Tuple[float, float]:
    """
    Computes (alignment_score 0.0 to 1.0, nearest_delta_seconds)
    representing whether an edit transition matches the rhythmic meter.
    """
    if not beats or cut_time_sec <= 0.01:
        return 0.0, 0.0

    min_delta = float("inf")
    for b in beats:
        delta = abs(cut_time_sec - b.time_sec)
        if delta < min_delta:
            min_delta = delta

    # Scoring curve based on frame tolerances (at 24/30fps, 1 frame is ~33-41ms)
    if min_delta <= 0.05:  # Within ~1-1.5 frames: tight beat sync
        score = 1.0
    elif min_delta <= 0.10:  # Within ~2-3 frames: good rhythmic alignment
        score = 0.85
    elif min_delta <= 0.18:  # Within ~4-5 frames: loose alignment
        score = 0.50
    else:
        score = max(0.0, 1.0 - (min_delta / 0.50))

    return round(score, 3), round(min_delta, 3)
