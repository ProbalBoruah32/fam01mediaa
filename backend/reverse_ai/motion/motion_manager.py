"""
FAMONEMEDIA Reverse AI - Motion & Effects Analysis Coordinator
Coordinates optical flow, camera trajectory, speed ramping, transitions,
color profiling, and repeated footage detection for each clip.
"""

from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Tuple
import cv2
import numpy as np
from backend.reverse_ai.reconstruction.models import (
    CameraMotion,
    SpeedEstimation,
    ColorProfile,
)
from backend.reverse_ai.motion.optical_flow import compute_frame_optical_flow
from backend.reverse_ai.motion.camera_motion import classify_clip_camera_motion
from backend.reverse_ai.motion.speed_analysis import estimate_clip_speed
from backend.reverse_ai.motion.color_grading import analyze_clip_color_grade
from backend.reverse_ai.motion.transitions import analyze_transition_boundary
from backend.reverse_ai.motion.repeated_shots import compute_dhash, detect_repeated_clips


class MotionManager:
    def analyze_clip_motion_and_effects(
        self,
        video_path: str | Path,
        start_frame: int,
        end_frame: int,
        fps: float,
        rep_frame: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """
        Samples frames within clip to compute optical flow, camera motion,
        speed estimation, color grading, and perceptual dHash.
        """
        shot_len = max(1, end_frame - start_frame)
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return {
                "camera_motion": CameraMotion(),
                "speed_estimation": SpeedEstimation(),
                "color_profile": ColorProfile(),
                "perceptual_hash": None,
                "transition_in": "cut",
                "transition_in_duration": 0.0,
            }

        # 1. Optical flow sampling (sample up to 12 frame pairs across the shot)
        step = max(2, shot_len // 12)
        sample_indices = list(range(start_frame, end_frame, step))
        if len(sample_indices) < 2:
            sample_indices = [start_frame, min(end_frame, start_frame + 2)]

        flow_samples = []
        prev_gray = None

        for idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            gray = cv2.cvtColor(cv2.resize(frame, (320, 180)), cv2.COLOR_BGR2GRAY)
            if prev_gray is not None:
                metrics = compute_frame_optical_flow(prev_gray, gray)
                flow_samples.append(metrics)
            prev_gray = gray

        # 2. Transition analysis at head of clip (read 8 frames around start_frame)
        head_frames = []
        head_start = max(0, start_frame - 4)
        cap.set(cv2.CAP_PROP_POS_FRAMES, head_start)
        for _ in range(8):
            ret, frame = cap.read()
            if not ret:
                break
            head_frames.append(frame)

        cap.release()

        # Classify camera movement & speed
        cam_motion = classify_clip_camera_motion(flow_samples)
        spd_est = estimate_clip_speed(flow_samples, fps=fps)
        trans_in, trans_dur = analyze_transition_boundary(head_frames, fps=fps)

        # 3. Color grade & perceptual hash from representative frame
        if rep_frame is None and len(head_frames) > 0:
            rep_frame = head_frames[len(head_frames) // 2]

        color_prof = analyze_clip_color_grade(rep_frame) if rep_frame is not None else ColorProfile()
        p_hash = compute_dhash(rep_frame) if rep_frame is not None else None

        return {
            "camera_motion": cam_motion,
            "speed_estimation": spd_est,
            "color_profile": color_prof,
            "perceptual_hash": p_hash,
            "transition_in": trans_in,
            "transition_in_duration": trans_dur,
        }


motion_manager = MotionManager()
