"""
FAMONEMEDIA Reverse AI - On-Screen Text Category Classifier
Classifies text bounding boxes into semantic broadcast/editing categories:
Title, Subtitle, Lower Third, Watermark, Credit, or General Caption.
"""

from __future__ import annotations
from typing import List, Literal
from backend.reverse_ai.reconstruction.models import TextOverlay


def classify_text_overlay(
    text: str,
    bbox: List[float],  # [ymin, xmin, ymax, xmax] normalized
    confidence: float,
    timestamp_sec: float,
) -> TextOverlay:
    """
    Applies spatial and linguistic rules to categorize on-screen text overlays.
    """
    ymin, xmin, ymax, xmax = bbox
    height = ymax - ymin
    width = xmax - xmin
    center_y = (ymin + ymax) / 2.0
    center_x = (xmin + xmax) / 2.0

    category: Literal["title", "subtitle", "lower_third", "watermark", "credit", "other"] = "other"

    # Watermark / bug in top corners or bottom right corner
    if (ymin < 0.18 or ymin > 0.82) and (xmin < 0.22 or xmax > 0.78) and width < 0.35 and height < 0.12:
        category = "watermark"

    # Lower Third: bottom-left quadrant (often multi-line or distinct banner)
    elif 0.58 <= ymin <= 0.88 and xmin < 0.45:
        category = "lower_third"

    # Subtitle / Closed Caption: centered at the bottom
    elif ymin >= 0.72 and 0.15 <= center_x <= 0.85 and width > 0.15:
        category = "subtitle"

    # Main Title: large, centered in top or middle half
    elif center_y <= 0.55 and width > 0.25 and height > 0.04:
        category = "title"

    # Credit line: scrolling or listed text
    elif "directed" in text.lower() or "produced" in text.lower() or "written" in text.lower() or "starring" in text.lower():
        category = "credit"

    return TextOverlay(
        text=text,
        confidence=confidence,
        category=category,
        bbox_normalized=bbox,
        timestamp_sec=round(timestamp_sec, 3),
        is_inferred=False,  # Detected fact
    )
