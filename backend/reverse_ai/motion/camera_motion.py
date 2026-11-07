"""
FAMONEMEDIA Reverse AI - Camera Motion Classifier
Classifies cinematography movement (Pan, Tilt, Zoom, Static, Handheld)
from aggregated optical flow vectors across a clip.
"""

from __future__ import annotations
from typing import List, Dict, Any
from backend.reverse_ai.reconstruction.models import CameraMotion


def classify_clip_camera_motion(flow_samples: List[Dict[str, float]]) -> CameraMotion:
    """
    Evaluates aggregated optical flow metrics over sampled frames of a shot.
    """
    if not flow_samples:
        return CameraMotion(primary_motion="static", motion_magnitude=0.0, confidence=1.0)

    mean_mag = float(sum(s["mean_magnitude"] for s in flow_samples) / len(flow_samples))
    mean_dx = float(sum(s["avg_dx"] for s in flow_samples) / len(flow_samples))
    mean_dy = float(sum(s["avg_dy"] for s in flow_samples) / len(flow_samples))
    mean_div = float(sum(s["divergence"] for s in flow_samples) / len(flow_samples))
    mean_std = float(sum(s["std_magnitude"] for s in flow_samples) / len(flow_samples))

    # Static camera threshold
    if mean_mag < 0.45:
        return CameraMotion(
            primary_motion="static",
            motion_magnitude=round(mean_mag, 2),
            pan_score=round(abs(mean_dx), 2),
            tilt_score=round(abs(mean_dy), 2),
            zoom_score=round(abs(mean_div), 2),
            confidence=0.92,
            is_inferred=True,
            evidence="Sub-pixel optical flow magnitude under static threshold",
        )

    # Zoom detection: significant radial divergence
    if abs(mean_div) > 0.40 and abs(mean_div) > abs(mean_dx) * 0.7:
        if mean_div > 0:
            return CameraMotion(
                primary_motion="zoom_in",
                motion_magnitude=round(mean_mag, 2),
                zoom_score=round(mean_div, 2),
                confidence=0.86,
                is_inferred=True,
                evidence=f"Radial optical flow expansion detected (+{mean_div:.2f})",
            )
        else:
            return CameraMotion(
                primary_motion="zoom_out",
                motion_magnitude=round(mean_mag, 2),
                zoom_score=round(abs(mean_div), 2),
                confidence=0.86,
                is_inferred=True,
                evidence=f"Radial optical flow contraction detected ({mean_div:.2f})",
            )

    # Pan horizontal dominant
    if abs(mean_dx) > 0.75 and abs(mean_dx) > abs(mean_dy) * 1.3:
        direction = "pan_right" if mean_dx > 0 else "pan_left"
        return CameraMotion(
            primary_motion=direction,
            motion_magnitude=round(mean_mag, 2),
            pan_score=round(abs(mean_dx), 2),
            confidence=0.88,
            is_inferred=True,
            evidence=f"Horizontal translational flow vector ({direction})",
        )

    # Tilt vertical dominant
    if abs(mean_dy) > 0.75 and abs(mean_dy) > abs(mean_dx) * 1.3:
        direction = "tilt_down" if mean_dy > 0 else "tilt_up"
        return CameraMotion(
            primary_motion=direction,
            motion_magnitude=round(mean_mag, 2),
            tilt_score=round(abs(mean_dy), 2),
            confidence=0.88,
            is_inferred=True,
            evidence=f"Vertical translational flow vector ({direction})",
        )

    # Handheld / Shake: high standard deviation with fluctuating flow
    if mean_std > 1.8 and mean_mag > 1.0:
        return CameraMotion(
            primary_motion="handheld",
            motion_magnitude=round(mean_mag, 2),
            confidence=0.80,
            is_inferred=True,
            evidence="High multidirectional flow variance characteristic of organic handheld camera",
        )

    return CameraMotion(
        primary_motion="complex_movement",
        motion_magnitude=round(mean_mag, 2),
        confidence=0.75,
        is_inferred=True,
        evidence="Mixed translational and rotational optical flow",
    )
