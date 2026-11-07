"""
FAMONEMEDIA Reverse AI - Color Grading & Palette Profiler
Extracts dominant hex palettes, color temperature, saturation levels,
contrast ratios, and categorizes the aesthetic color treatment.
"""

from __future__ import annotations
from typing import List, Literal, Tuple
import cv2
import numpy as np
from backend.reverse_ai.reconstruction.models import ColorProfile


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def analyze_clip_color_grade(frame: np.ndarray) -> ColorProfile:
    """
    Computes aesthetic color metrics, dominant 5-color palette,
    temperature, and look style from representative frame.
    """
    if frame is None or frame.size == 0:
        return ColorProfile()

    # Small thumbnail for fast K-means color clustering
    small = cv2.resize(frame, (160, 90))
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)

    # 1. Dominant 5-color palette using K-means
    pixels = rgb.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    k = 5
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    
    # Sort centers by frequency
    counts = np.bincount(labels.flatten())
    sorted_indices = np.argsort(counts)[::-1]
    dominant_hexes = [
        rgb_to_hex(int(centers[i][0]), int(centers[i][1]), int(centers[i][2]))
        for i in sorted_indices
    ]

    # 2. Saturation & Luminance
    mean_sat = float(np.mean(hsv[..., 1]))
    mean_val = float(np.mean(hsv[..., 2]))

    saturation_level: Literal["monochrome", "muted", "natural", "vibrant", "stylized"]
    if mean_sat < 18.0:
        saturation_level = "monochrome"
    elif mean_sat < 60.0:
        saturation_level = "muted"
    elif mean_sat < 130.0:
        saturation_level = "natural"
    elif mean_sat < 190.0:
        saturation_level = "vibrant"
    else:
        saturation_level = "stylized"

    # 3. Color Temperature (R vs B balance)
    mean_r = float(np.mean(rgb[..., 0]))
    mean_b = float(np.mean(rgb[..., 2]))
    rb_diff = mean_r - mean_b

    temperature: Literal["warm", "cool", "neutral"]
    if rb_diff > 18.0:
        temperature = "warm"
    elif rb_diff < -18.0:
        temperature = "cool"
    else:
        temperature = "neutral"

    # 4. Contrast ratio
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    p95 = float(np.percentile(gray, 95))
    p5 = max(1.0, float(np.percentile(gray, 5)))
    contrast = round(p95 / p5, 2)

    # 5. Look identification
    look = "Standard Rec.709"
    if saturation_level == "monochrome":
        look = "High Contrast Black & White"
    elif temperature == "warm" and saturation_level in ["natural", "vibrant"]:
        look = "Warm Golden Hour"
    elif temperature == "cool" and saturation_level in ["natural", "muted"]:
        look = "Cool Commercial Neutral"
    elif abs(rb_diff) > 25.0 and contrast > 8.0:
        look = "Cinematic Stylized Grade"

    return ColorProfile(
        dominant_palette_hex=dominant_hexes,
        temperature=temperature,
        saturation_level=saturation_level,
        contrast_ratio=contrast,
        mean_brightness=round(mean_val, 1),
        estimated_look=look,
        confidence=0.88,
        is_inferred=True,
    )
