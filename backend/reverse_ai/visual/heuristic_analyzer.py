"""
FAMONEMEDIA Reverse AI - Computer Vision Heuristic Visual Analyzer
CPU-only, ultra-fast visual understanding engine that extracts shot framing,
lighting style, subject categorization, and compositional notes from video frames.
Serves as the guaranteed zero-cloud fallback when deep VLM weights are not downloaded.
"""

from __future__ import annotations
from typing import Dict, Any, List, Literal, Tuple
import cv2
import numpy as np
from backend.reverse_ai.reconstruction.models import VisualSummary, ColorProfile


def estimate_shot_framing(frame: np.ndarray) -> Tuple[str, str]:
    """
    Analyzes edge distribution and central subject area to categorize shot framing.
    """
    h, w = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Face detection using OpenCV's built-in Haar cascade if available
    try:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
        if len(faces) > 0:
            # Largest detected face
            fx, fy, fw, fh = max(faces, key=lambda b: b[2] * b[3])
            face_ratio = float(fh) / h
            if face_ratio > 0.45:
                return "extreme_close_up", "person"
            elif face_ratio > 0.25:
                return "close_up", "person"
            elif face_ratio > 0.12:
                return "medium_close_up", "person"
            elif face_ratio > 0.05:
                return "medium", "person"
            else:
                return "wide", "person"
    except Exception:
        pass

    # Salience & contour area heuristic
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    center_region = edges[int(h * 0.2) : int(h * 0.8), int(w * 0.2) : int(w * 0.8)]
    center_density = float(np.count_nonzero(center_region)) / (0.36 * h * w)

    if center_density > 0.15:
        return "medium_close_up", "graphics_or_object"
    elif center_density > 0.08:
        return "medium", "general"
    else:
        return "wide", "environment"


def estimate_lighting(frame: np.ndarray) -> str:
    """Analyzes luminance histogram, shadow clipping, and highlight distribution."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    mean_lum = float(np.mean(gray))
    std_lum = float(np.std(gray))
    dark_ratio = float(np.count_nonzero(gray < 40)) / gray.size
    bright_ratio = float(np.count_nonzero(gray > 220)) / gray.size

    if dark_ratio > 0.40 and mean_lum < 70:
        return "low_key_dramatic"
    elif bright_ratio > 0.35 and mean_lum > 180:
        return "high_key_commercial"
    elif std_lum > 65:
        return "high_contrast_studio"
    else:
        return "natural_balanced"


def analyze_frame_heuristics(frame: np.ndarray) -> VisualSummary:
    """Combines CV framing, lighting, and composition heuristics into a VisualSummary domain object."""
    if frame is None or frame.size == 0:
        return VisualSummary(
            description="Empty or unavailable frame.",
            shot_type="medium",
            subject_category="unknown",
            lighting_style="natural",
            model_used="cv_heuristic_engine",
            confidence=0.5,
        )

    framing, subject = estimate_shot_framing(frame)
    lighting = estimate_lighting(frame)
    h, w = frame.shape[:2]

    # Readable description
    framing_label = framing.replace("_", " ").title()
    lighting_label = lighting.replace("_", " ")
    desc = f"{framing_label} shot featuring {subject} in {lighting_label} lighting."

    return VisualSummary(
        description=desc,
        shot_type=framing,  # type: ignore
        subject_category=subject,
        lighting_style=lighting,
        composition_notes=f"Aspect {w}x{h}, centered focus.",
        model_used="cv_heuristic_engine",
        confidence=0.82,
        is_inferred=True,
    )
