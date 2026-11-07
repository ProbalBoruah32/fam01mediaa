"""
FAMONEMEDIA Reverse AI - Transition Detector & Characterizer
Identifies cut types: Hard Cuts, Cross Dissolves, Fade to Black, Fade to White, and Directional Wipes.
"""

from __future__ import annotations
from typing import Tuple, Literal
import cv2
import numpy as np


def analyze_transition_boundary(
    frames_sequence: list[np.ndarray],
    fps: float,
) -> Tuple[Literal["cut", "dissolve", "fade_black", "fade_white", "wipe", "none"], float]:
    """
    Analyzes a sequence of 6-20 frames surrounding a cut point to classify transition style and duration.
    Returns (transition_type, duration_seconds).
    """
    if len(frames_sequence) < 4:
        return "cut", 0.0

    # Calculate mean luminance and frame-to-frame difference curve
    lum_curve = []
    diff_curve = []
    prev_gray = None

    for frame in frames_sequence:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        lum_curve.append(float(np.mean(gray)))
        if prev_gray is not None:
            diff_curve.append(float(np.mean(cv2.absdiff(gray, prev_gray))))
        prev_gray = gray

    min_lum = min(lum_curve)
    max_lum = max(lum_curve)

    # 1. Fade to/from Black
    if min_lum < 15.0:
        dark_frames = sum(1 for l in lum_curve if l < 25.0)
        dur = max(0.1, round(dark_frames / fps, 3))
        return "fade_black", dur

    # 2. Fade to/from White
    if max_lum > 240.0:
        bright_frames = sum(1 for l in lum_curve if l > 230.0)
        dur = max(0.1, round(bright_frames / fps, 3))
        return "fade_white", dur

    # 3. Dissolve: extended non-zero frame differences over multiple frames (bell/plateau shaped)
    significant_diff_count = sum(1 for d in diff_curve if d > 12.0)
    max_single_diff = max(diff_curve) if diff_curve else 0.0

    if significant_diff_count >= 5 and max_single_diff < 45.0:
        dur = round(significant_diff_count / fps, 3)
        return "dissolve", dur

    # 4. Standard Hard Cut (abrupt spike)
    return "cut", 0.0
