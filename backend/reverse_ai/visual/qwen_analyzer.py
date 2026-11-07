"""
FAMONEMEDIA Reverse AI - Qwen2.5-VL-3B Local Visual Understanding Engine
Supports lazy CPU inference with local weights detection,
verifies RAM/disk constraints before loading, and reports honest status.
"""

from __future__ import annotations
import os
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np
from PIL import Image
from backend.app.config import settings
from backend.reverse_ai.reconstruction.models import VisualSummary


class QwenVisualAnalyzer:
    def __init__(self, model_dir: Optional[Path] = None):
        self.model_dir = model_dir or settings.QWEN_MODEL_DIR
        self.model = None
        self.processor = None
        self.is_loaded = False
        self.load_attempted = False
        self.load_error: Optional[str] = None

    def has_weights(self) -> bool:
        """Checks if local model weights or config files exist in models/qwen2.5-vl-3b."""
        if not self.model_dir.exists():
            return False
        # Look for standard HF model files (config.json, safetensors/bin, or gguf)
        has_config = (self.model_dir / "config.json").exists()
        has_weights = any(self.model_dir.glob("*.safetensors")) or any(self.model_dir.glob("*.bin")) or any(self.model_dir.glob("*.gguf"))
        return has_config or has_weights

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_name": "Qwen2.5-VL-3B-Instruct",
            "weights_present": self.has_weights(),
            "model_directory": str(self.model_dir),
            "is_loaded": self.is_loaded,
            "device": settings.QWEN_DEVICE,
            "load_error": self.load_error,
            "fallback_active": not self.is_loaded,
            "fallback_engine": "CV Heuristic Visual Analyzer",
        }

    def lazy_load(self) -> bool:
        if self.is_loaded:
            return True
        if self.load_attempted:
            return False

        self.load_attempted = True
        if not self.has_weights():
            self.load_error = f"Model weights not found at {self.model_dir}. Download Qwen2.5-VL-3B to enable neural vision inference."
            return False

        try:
            import torch
            from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor

            # Check available RAM before loading ~7GB model
            import psutil
            avail_gb = psutil.virtual_memory().available / (1024**3)
            if avail_gb < 6.0:
                self.load_error = f"Insufficient available RAM ({avail_gb:.1f} GB free, minimum 6.0 GB required for 3B VLM)."
                return False

            print(f"[Qwen2.5-VL] Loading weights from {self.model_dir} on {settings.QWEN_DEVICE}...")
            self.processor = AutoProcessor.from_pretrained(str(self.model_dir))
            self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                str(self.model_dir),
                torch_dtype=torch.float32,
                device_map=settings.QWEN_DEVICE,
                low_cpu_mem_usage=True,
            )
            self.is_loaded = True
            return True
        except Exception as e:
            self.load_error = f"Failed to load Qwen2.5-VL model: {str(e)}"
            print(f"[Qwen2.5-VL] {self.load_error}")
            return False

    def analyze_frame(self, frame: np.ndarray) -> Optional[VisualSummary]:
        if not self.lazy_load() or self.model is None or self.processor is None:
            return None

        try:
            # Convert OpenCV BGR to PIL RGB
            import cv2
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)

            prompt = (
                "Identify: 1) Shot framing (extreme_wide, wide, medium, close_up, extreme_close_up), "
                "2) Subject category, 3) Lighting style, 4) Brief visual summary under 20 words."
            )
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": pil_img},
                        {"type": "text", "text": prompt},
                    ],
                }
            ]

            text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            inputs = self.processor(
                text=[text],
                images=[pil_img],
                padding=True,
                return_tensors="pt",
            ).to(settings.QWEN_DEVICE)

            outputs = self.model.generate(**inputs, max_new_tokens=settings.QWEN_MAX_TOKENS)
            generated_ids = [
                out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, outputs)
            ]
            response = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()

            # Parse framing from text
            framing = "medium"
            for candidate in ["extreme_wide", "wide", "medium_close_up", "close_up", "extreme_close_up"]:
                if candidate in response.lower() or candidate.replace("_", " ") in response.lower():
                    framing = candidate
                    break

            return VisualSummary(
                description=response,
                shot_type=framing,  # type: ignore
                subject_category="ai_vision_detected",
                lighting_style="ai_analyzed",
                composition_notes="Qwen2.5-VL-3B multimodal vision analysis",
                model_used="qwen2.5-vl-3b-instruct",
                confidence=0.92,
                is_inferred=True,
            )
        except Exception as e:
            print(f"[Qwen2.5-VL] Inference failed: {e}")
            return None


qwen_analyzer = QwenVisualAnalyzer()
