"""
FAMONEMEDIA Reverse AI - PP-OCR On-Screen Text Detector
Executes CPU-only ONNX inference of PaddleOCR / PP-OCR models with RapidOCR,
featuring automatic fallback and normalized bounding box output.
"""

from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from backend.app.config import settings


class PPOCRTextDetector:
    def __init__(self):
        self.engine = None
        self.is_loaded = False
        self._init_engine()

    def _init_engine(self):
        try:
            from rapidocr_onnxruntime import RapidOCR
            self.engine = RapidOCR()
            self.is_loaded = True
        except Exception as e:
            print(f"[PP-OCR] RapidOCR initialization failed: {e}. Falling back to visual heuristics.")
            self.is_loaded = False

    def is_available(self) -> bool:
        return self.is_loaded

    def detect_text_in_frame(
        self,
        frame: np.ndarray,
        min_confidence: float = settings.OCR_CONFIDENCE_THRESHOLD,
    ) -> List[Dict[str, Any]]:
        """
        Runs text detection and recognition on an RGB/BGR numpy frame.
        Returns list of detections with text, confidence, and normalized [ymin, xmin, ymax, xmax].
        """
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        results = []

        if self.is_loaded and self.engine is not None:
            try:
                # RapidOCR accepts numpy image
                ocr_result, elapse_list = self.engine(frame)
                if ocr_result:
                    for line in ocr_result:
                        # line format: [dt_boxes, text, score]
                        dt_box, text, score = line
                        if float(score) >= min_confidence and text.strip():
                            # dt_box is 4 points: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
                            pts = np.array(dt_box, dtype=np.float32)
                            xmin = float(np.min(pts[:, 0])) / w
                            xmax = float(np.max(pts[:, 0])) / w
                            ymin = float(np.min(pts[:, 1])) / h
                            ymax = float(np.max(pts[:, 1])) / h

                            # Clamp to 0.0 - 1.0
                            results.append({
                                "text": str(text).strip(),
                                "confidence": round(float(score), 3),
                                "bbox_normalized": [
                                    round(max(0.0, min(1.0, ymin)), 4),
                                    round(max(0.0, min(1.0, xmin)), 4),
                                    round(max(0.0, min(1.0, ymax)), 4),
                                    round(max(0.0, min(1.0, xmax)), 4),
                                ],
                                "engine": "PP-OCRv4/RapidOCR",
                            })
                    return results
            except Exception as e:
                print(f"[PP-OCR] Inference error on frame: {e}")

        # Fallback contour text region detection
        return self._detect_text_fallback_contours(frame)

    def _detect_text_fallback_contours(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Edge and morphological text region proposal fallback when deep OCR engine is unavailable."""
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        morphed = cv2.morphologyEx(gray, cv2.MORPH_GRADIENT, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
        _, thresh = cv2.threshold(morphed, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 3))
        connected = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        proposals = []
        for c in contours:
            x, y, cw, ch = cv2.boundingRect(c)
            aspect = float(cw) / ch if ch > 0 else 0
            if cw > 40 and 10 < ch < 120 and aspect > 1.5:
                proposals.append({
                    "text": "[Text Region Detected]",
                    "confidence": 0.65,
                    "bbox_normalized": [
                        round(y / h, 4),
                        round(x / w, 4),
                        round((y + ch) / h, 4),
                        round((x + cw) / w, 4),
                    ],
                    "engine": "CV_Morphology_Heuristic",
                })
        return proposals[:5]  # Limit to top proposals


ppocr_detector = PPOCRTextDetector()
