"""
FAMONEMEDIA Reverse AI - OCR Pipeline Manager
Samples clip frames, executes PP-OCR / RapidOCR text detection,
filters duplicates, and aggregates text overlays across the clip timeline.
"""

from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
from difflib import SequenceMatcher
from backend.app.config import settings
from backend.reverse_ai.reconstruction.models import TextOverlay
from backend.reverse_ai.ocr.paddle_ocr import ppocr_detector
from backend.reverse_ai.ocr.text_classifier import classify_text_overlay


def is_similar_text(a: str, b: str, threshold: float = 0.8) -> bool:
    return SequenceMatcher(None, a.strip().lower(), b.strip().lower()).ratio() >= threshold


class OCRManager:
    def __init__(self):
        self.detector = ppocr_detector

    def get_status(self) -> Dict[str, Any]:
        return {
            "ppocr_available": self.detector.is_available(),
            "engine": "PP-OCRv4 / RapidOCR (ONNX CPU)" if self.detector.is_available() else "CV Morphology Heuristic",
        }

    def analyze_clip_text(
        self,
        video_path: str | Path,
        start_frame: int,
        end_frame: int,
        fps: float,
    ) -> List[TextOverlay]:
        """
        Samples frames across the clip and returns categorized, de-duplicated TextOverlay objects.
        """
        shot_len = max(1, end_frame - start_frame)
        duration_sec = shot_len / fps

        # Sample at ~1 fps, minimum 1 frame, maximum 5 frames per shot to maintain fast CPU turnaround
        num_samples = max(1, min(5, int(duration_sec * settings.OCR_SAMPLE_FPS)))
        sample_indices = [
            start_frame + int(shot_len * ((i + 0.5) / num_samples))
            for i in range(num_samples)
        ]

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return []

        overlays: List[TextOverlay] = []
        seen_texts: List[str] = []

        for f_idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            time_sec = f_idx / fps
            raw_detections = self.detector.detect_text_in_frame(frame)

            for det in raw_detections:
                text = det["text"]
                # Filter out pure noise / tiny symbols
                if len(text) < 2 and not text.isalnum():
                    continue

                # Check if already recorded in this clip
                if any(is_similar_text(text, st) for st in seen_texts):
                    continue

                classified = classify_text_overlay(
                    text=text,
                    bbox=det["bbox_normalized"],
                    confidence=det["confidence"],
                    timestamp_sec=time_sec,
                )
                overlays.append(classified)
                seen_texts.append(text)

        cap.release()
        return overlays


ocr_manager = OCRManager()
