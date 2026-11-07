"""
FAMONEMEDIA Reverse AI - Shot Boundary Detector Manager
Coordinates TransNetV2 as primary detector, PySceneDetect as fallback & cross-checker,
and executes boundary refinement.
"""

from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional
from backend.app.config import settings
from backend.reverse_ai.reconstruction.models import VideoMetadata
from backend.reverse_ai.detection.transnet import TransNetV2Detector
from backend.reverse_ai.detection.scenedetect_runner import detect_scenes_pyscenedetect
from backend.reverse_ai.detection.boundary_refiner import reconcile_and_refine_boundaries


class BoundaryDetectionManager:
    def __init__(self):
        self.transnet = TransNetV2Detector()

    def get_status(self) -> Dict[str, Any]:
        return {
            "transnetv2_available": self.transnet.is_available(),
            "transnetv2_model_path": str(self.transnet.model_path),
            "pyscenedetect_available": True,
            "primary_engine": "TransNetV2 (ONNX)" if self.transnet.is_available() else "PySceneDetect (Content/Adaptive)",
        }

    def detect_boundaries(
        self,
        video_path: str | Path,
        metadata: VideoMetadata,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes primary and secondary boundary detectors, cross-verifies results,
        and produces frame-accurate refined shots.
        """
        transnet_results = []
        if self.transnet.is_available():
            if progress_callback:
                progress_callback("Running TransNetV2 deep learning shot detection...")
            try:
                raw_tn = self.transnet.predict_video(video_path)
                transnet_results = [
                    {"start_frame": s, "end_frame": e, "confidence": c}
                    for s, e, c in raw_tn
                ]
            except Exception as e:
                if progress_callback:
                    progress_callback(f"TransNetV2 encountered error, falling back: {e}")

        if progress_callback:
            progress_callback("Running PySceneDetect multi-detector cross-verification...")
        scenedetect_results = detect_scenes_pyscenedetect(video_path)

        if progress_callback:
            progress_callback("Snapping cut boundaries to frame precision and fusing consensus...")

        refined_shots = reconcile_and_refine_boundaries(
            video_path=video_path,
            fps=metadata.fps,
            total_frames=metadata.total_frames,
            transnet_scenes=transnet_results,
            scenedetect_scenes=scenedetect_results,
        )

        return refined_shots


detector_manager = BoundaryDetectionManager()
