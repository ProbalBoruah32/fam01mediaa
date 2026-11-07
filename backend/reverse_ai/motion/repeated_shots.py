"""
FAMONEMEDIA Reverse AI - Repeated Shot & Duplicate Footage Detector
Identifies reused or repeated footage sequences using perceptual dHash and color histogram matching.
"""

from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
import cv2
import numpy as np
from backend.app.config import settings


def compute_dhash(image: np.ndarray, hash_size: int = 8) -> str:
    """
    Computes difference hash (dHash) for an image.
    Returns 64-bit hexadecimal string.
    """
    resized = cv2.resize(image, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY) if resized.ndim == 3 else resized
    diff = gray[:, 1:] > gray[:, :-1]
    
    # Pack boolean bits into integer then hex
    decimal_val = 0
    for bit in diff.flatten():
        decimal_val = (decimal_val << 1) | int(bit)
    return f"{decimal_val:016x}"


def hamming_distance(hex1: str, hex2: str) -> int:
    """Calculates bitwise Hamming distance between two hex hashes."""
    try:
        val1 = int(hex1, 16)
        val2 = int(hex2, 16)
        xor_val = val1 ^ val2
        return bin(xor_val).count("1")
    except Exception:
        return 64


def detect_repeated_clips(
    clip_records: List[Dict[str, Any]],
    max_hamming_dist: int = settings.REPEATED_SHOT_HASH_THRESHOLD,
) -> None:
    """
    Mutates clip_records in-place to annotate repeated / duplicate footage
    against earlier occurring shots in the timeline.
    """
    for i in range(len(clip_records)):
        curr = clip_records[i]
        curr_hash = curr.get("perceptual_hash")
        if not curr_hash:
            continue

        for j in range(0, i):
            prev = clip_records[j]
            prev_hash = prev.get("perceptual_hash")
            if not prev_hash:
                continue

            dist = hamming_distance(curr_hash, prev_hash)
            if dist <= max_hamming_dist:
                curr["is_repeated_footage"] = True
                curr["repeated_clip_id"] = prev["id"]
                break
