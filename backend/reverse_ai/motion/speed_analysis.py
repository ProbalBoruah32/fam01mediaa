"""
FAMONEMEDIA Reverse AI - Speed & Frame Rate Analysis
Infers slow-motion, standard speed, and speed ramping based on motion consistency.
"""

from __future__ import annotations
from typing import List, Dict, Any
from backend.reverse_ai.reconstruction.models import SpeedEstimation


def estimate_clip_speed(flow_samples: List[Dict[str, float]], fps: float) -> SpeedEstimation:
    """
    Evaluates motion consistency across clip to estimate playback speed factor.
    """
    if not flow_samples:
        return SpeedEstimation(speed_factor=1.0, label="normal", confidence=0.8)

    mags = [s["mean_magnitude"] for s in flow_samples]
    mean_mag = float(sum(mags) / len(mags))
    std_mag = float(sum(abs(m - mean_mag) for m in mags) / len(mags))

    # Slow motion indicator: very low jitter, high fluidity, subtle sub-pixel flow
    if 0.15 < mean_mag < 0.65 and std_mag < 0.12 and fps >= 24.0:
        return SpeedEstimation(
            speed_factor=0.5,
            label="slow_motion",
            motion_variance=round(std_mag, 3),
            confidence=0.78,
            is_inferred=True,
            evidence="Sub-pixel uniform optical flow indicative of high-frame-rate slow motion conforming",
        )

    # Hyperlapse / speed ramp: high abrupt jumps
    if mean_mag > 3.5 and std_mag > 2.0:
        return SpeedEstimation(
            speed_factor=2.0,
            label="speed_ramp_up",
            motion_variance=round(std_mag, 3),
            confidence=0.74,
            is_inferred=True,
            evidence="High inter-frame optical flow acceleration",
        )

    return SpeedEstimation(
        speed_factor=1.0,
        label="normal",
        motion_variance=round(std_mag, 3),
        confidence=0.90,
        is_inferred=True,
        evidence="Normal real-time motion velocity envelope",
    )
