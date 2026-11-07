"""
FAMONEMEDIA Reverse AI - Visual Understanding Manager
Combines Qwen2.5-VL-3B with local computer vision heuristic engine,
ensuring uninterrupted operation and complete transparency about model execution.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
import numpy as np
from backend.reverse_ai.reconstruction.models import VisualSummary
from backend.reverse_ai.visual.qwen_analyzer import qwen_analyzer
from backend.reverse_ai.visual.heuristic_analyzer import analyze_frame_heuristics


class VisualManager:
    def __init__(self):
        self.qwen = qwen_analyzer

    def get_status(self) -> Dict[str, Any]:
        return self.qwen.get_status()

    def analyze_frame(self, frame: np.ndarray) -> VisualSummary:
        """
        Attempts Qwen inference if weights are present and system memory permits;
        otherwise runs robust, instantaneous computer vision heuristics.
        """
        if self.qwen.has_weights():
            res = self.qwen.analyze_frame(frame)
            if res is not None:
                return res

        # Run guaranteed CV heuristic fallback
        return analyze_frame_heuristics(frame)


visual_manager = VisualManager()
