"""
FAMONEMEDIA Reverse AI - PySceneDetect Detector & Verification Runner
Multi-detector scene boundary detection using ContentDetector, AdaptiveDetector,
and ThresholdDetector with frame-accurate timestamp resolution.
"""

from __future__ import annotations
from pathlib import Path
from typing import List, Tuple, Dict, Any
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector, AdaptiveDetector, ThresholdDetector
from backend.app.config import settings


def detect_scenes_pyscenedetect(
    video_path: str | Path,
    threshold: float = settings.SCENEDETECT_THRESHOLD,
    adaptive_threshold: float = settings.SCENEDETECT_ADAPTIVE_THRESHOLD,
    min_scene_len: int = settings.MIN_SCENE_LEN_FRAMES,
) -> List[Dict[str, Any]]:
    """
    Runs PySceneDetect with ContentDetector and AdaptiveDetector.
    Returns list of scene dictionaries with start/end frames and timestamps.
    """
    video = open_video(str(video_path))
    scene_manager = SceneManager()

    # Combine ContentDetector with AdaptiveDetector for robust cut detection
    scene_manager.add_detector(
        AdaptiveDetector(
            adaptive_threshold=adaptive_threshold,
            min_scene_len=min_scene_len,
        )
    )
    scene_manager.add_detector(
        ContentDetector(
            threshold=threshold,
            min_scene_len=min_scene_len,
        )
    )

    # Perform detection
    scene_manager.detect_scenes(video)
    scene_list = scene_manager.get_scene_list()

    results = []
    fps = video.frame_rate

    if not scene_list:
        # Whole video is a single shot
        total_frames = video.duration.get_frames() if hasattr(video, "duration") else 0
        dur_sec = total_frames / fps if fps > 0 else 0.0
        return [{
            "start_frame": 0,
            "end_frame": max(1, total_frames - 1),
            "start_time": 0.0,
            "end_time": dur_sec,
            "duration": dur_sec,
            "source": "scenedetect_single",
            "confidence": 0.9,
        }]

    for idx, (start_time, end_time) in enumerate(scene_list):
        s_frame = start_time.get_frames()
        e_frame = end_time.get_frames()
        s_sec = start_time.get_seconds()
        e_sec = end_time.get_seconds()

        results.append({
            "start_frame": s_frame,
            "end_frame": max(s_frame + 1, e_frame - 1),  # PySceneDetect end frame is exclusive
            "start_time": round(s_sec, 3),
            "end_time": round(e_sec, 3),
            "duration": round(e_sec - s_sec, 3),
            "source": "scenedetect_adaptive+content",
            "confidence": 0.92,
        })

    return results
