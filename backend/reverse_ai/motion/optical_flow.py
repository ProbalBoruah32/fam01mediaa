"""
FAMONEMEDIA Reverse AI - Optical Flow Engine
Computes dense Gunnar-Farneback optical flow fields to measure motion vectors,
radial divergence (zoom in/out), rotational curl, and flow variance.
"""

from __future__ import annotations
from typing import Tuple, Dict, Any, List
import cv2
import numpy as np


def compute_frame_optical_flow(
    prev_gray: np.ndarray,
    curr_gray: np.ndarray,
) -> Dict[str, float]:
    """
    Calculates dense Farneback optical flow and decomposes it into
    translational (pan/tilt), radial divergence (zoom), and variance components.
    """
    flow = cv2.calcOpticalFlowFarneback(
        prev_gray,
        curr_gray,
        None,
        pyr_scale=0.5,
        levels=3,
        winsize=15,
        iterations=3,
        poly_n=5,
        poly_sigma=1.2,
        flags=0,
    )

    dx = flow[..., 0]
    dy = flow[..., 1]

    mag, ang = cv2.cartToPolar(dx, dy)
    mean_mag = float(np.mean(mag))
    std_mag = float(np.std(mag))

    avg_dx = float(np.mean(dx))
    avg_dy = float(np.mean(dy))

    # Radial divergence calculation (center outward expansion or inward contraction)
    h, w = prev_gray.shape[:2]
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    cx, cy = w / 2.0, h / 2.0

    rx = x_coords - cx
    ry = y_coords - cy
    r_norm = np.sqrt(rx**2 + ry**2) + 1e-5

    # Dot product between flow vector and radial outward unit vector
    radial_component = (dx * (rx / r_norm) + dy * (ry / r_norm))
    mean_divergence = float(np.mean(radial_component))

    return {
        "mean_magnitude": mean_mag,
        "std_magnitude": std_mag,
        "avg_dx": avg_dx,
        "avg_dy": avg_dy,
        "divergence": mean_divergence,
    }
