"""
FAMONEMEDIA Reverse AI - Boundary Refinement & Multi-Detector Cross-Checking
Snaps shot boundaries to frame precision using local pixel gradient analysis,
reconciles TransNetV2 and PySceneDetect detections, and assigns evidence-backed confidence scores.
"""

from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from backend.app.config import settings


def find_exact_cut_frame_in_window(video_path: str | Path, center_frame: int, window: int = 4) -> int:
    """
    Examines local frame-to-frame pixel differences in [center_frame - window, center_frame + window]
    to locate the exact single-frame difference peak.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return center_frame

    start = max(0, center_frame - window)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)

    prev_gray = None
    max_diff = -1.0
    best_frame = center_frame

    for f in range(start, center_frame + window + 1):
        ret, frame = cap.read()
        if not ret:
            break
        # Convert to small grayscale for fast difference
        gray = cv2.cvtColor(cv2.resize(frame, (160, 90)), cv2.COLOR_BGR2GRAY)
        if prev_gray is not None:
            diff = float(np.mean(cv2.absdiff(gray, prev_gray)))
            if diff > max_diff:
                max_diff = diff
                best_frame = f
        prev_gray = gray

    cap.release()
    return best_frame


def reconcile_and_refine_boundaries(
    video_path: str | Path,
    fps: float,
    total_frames: int,
    transnet_scenes: List[Dict[str, Any]],
    scenedetect_scenes: List[Dict[str, Any]],
    tolerance_frames: int = settings.FRAME_SNAPPING_TOLERANCE,
) -> List[Dict[str, Any]]:
    """
    Merges cut boundaries from both detectors, snaps them to exact frame boundaries,
    ensures contiguous timeline coverage from frame 0 to total_frames - 1,
    and assigns consensus confidence scores.
    """
    cut_candidates = []

    # Collect cut points (end_frame of each scene)
    for sc in transnet_scenes:
        if sc["end_frame"] < total_frames - 1:
            cut_candidates.append({
                "frame": sc["end_frame"],
                "source": "transnetv2",
                "score": sc.get("confidence", 0.9),
            })

    for sc in scenedetect_scenes:
        if sc["end_frame"] < total_frames - 1:
            cut_candidates.append({
                "frame": sc["end_frame"],
                "source": "scenedetect",
                "score": sc.get("confidence", 0.9),
            })

    # Sort candidates by frame
    cut_candidates.sort(key=lambda c: c["frame"])

    # Cluster candidates that are within tolerance
    clustered_cuts = []
    i = 0
    while i < len(cut_candidates):
        cluster = [cut_candidates[i]]
        j = i + 1
        while j < len(cut_candidates) and (cut_candidates[j]["frame"] - cut_candidates[i]["frame"]) <= tolerance_frames:
            cluster.append(cut_candidates[j])
            j += 1

        sources = {c["source"] for c in cluster}
        has_transnet = "transnetv2" in sources
        has_scenedetect = "scenedetect" in sources

        # Representative frame candidate
        median_frame = int(np.median([c["frame"] for c in cluster]))
        
        # Snap to local frame diff peak
        refined_frame = find_exact_cut_frame_in_window(video_path, median_frame, window=3)

        if has_transnet and has_scenedetect:
            source_label = "consensus (TransNetV2 + PySceneDetect)"
            confidence = 0.98
        elif has_transnet:
            source_label = "TransNetV2 (verified)"
            confidence = 0.90
        else:
            source_label = "PySceneDetect (Content/Adaptive)"
            confidence = 0.88

        clustered_cuts.append({
            "cut_frame": refined_frame,
            "source": source_label,
            "confidence": confidence,
        })
        i = j

    # Enforce minimum spacing between cuts
    filtered_cuts = []
    last_frame = 0
    for cut in clustered_cuts:
        cf = cut["cut_frame"]
        if cf - last_frame >= settings.MIN_SCENE_LEN_FRAMES and (total_frames - cf) >= settings.MIN_SCENE_LEN_FRAMES:
            filtered_cuts.append(cut)
            last_frame = cf

    # Construct complete contiguous shot list
    shots: List[Dict[str, Any]] = []
    curr_start = 0

    for idx, cut in enumerate(filtered_cuts):
        end_f = cut["cut_frame"]
        s_sec = curr_start / fps
        e_sec = (end_f + 1) / fps
        shots.append({
            "index": idx + 1,
            "start_frame": curr_start,
            "end_frame": end_f,
            "start_time": round(s_sec, 3),
            "end_time": round(e_sec, 3),
            "duration": round(e_sec - s_sec, 3),
            "source": cut["source"],
            "confidence": cut["confidence"],
        })
        curr_start = end_f + 1

    # Final shot to end of video
    if curr_start < total_frames:
        s_sec = curr_start / fps
        e_sec = total_frames / fps
        shots.append({
            "index": len(shots) + 1,
            "start_frame": curr_start,
            "end_frame": total_frames - 1,
            "start_time": round(s_sec, 3),
            "end_time": round(e_sec, 3),
            "duration": round(e_sec - s_sec, 3),
            "source": "timeline_terminus",
            "confidence": 0.99,
        })

    return shots
