"""
FAMONEMEDIA Reverse AI - TransNetV2 Shot Boundary Detector
Implements local ONNX CPU inference for TransNetV2 with sliding window evaluation.
Gracefully reports when model weights are not downloaded, yielding to PySceneDetect.
"""

from __future__ import annotations
import os
from pathlib import Path
from typing import List, Tuple, Optional
import cv2
import numpy as np
from backend.app.config import settings


class TransNetV2Detector:
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or settings.TRANSNET_MODEL_PATH
        self.session = None
        self.is_loaded = False
        self._check_and_load()

    def _check_and_load(self) -> bool:
        if self.model_path and Path(self.model_path).exists():
            try:
                import onnxruntime as ort
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = settings.MAX_CPU_THREADS
                opts.inter_op_num_threads = 1
                opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                self.session = ort.InferenceSession(
                    str(self.model_path),
                    sess_options=opts,
                    providers=["CPUExecutionProvider"],
                )
                self.is_loaded = True
                return True
            except Exception as e:
                print(f"[TransNetV2] Failed to initialize ONNX session: {e}")
                self.is_loaded = False
                return False
        return False

    def is_available(self) -> bool:
        return self.is_loaded

    def predict_video(
        self,
        video_path: str | Path,
        threshold: float = settings.TRANSNET_THRESHOLD,
    ) -> List[Tuple[int, int, float]]:
        """
        Runs TransNetV2 inference over video frames resized to (48, 27).
        TransNetV2 processes batches of 100 frames with shape [B, 100, 27, 48, 3].
        Returns list of (start_frame, end_frame, confidence).
        """
        if not self.is_loaded or self.session is None:
            return []

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return []

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            cap.release()
            return []

        # Read and downsample frames
        frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            # TransNetV2 expects 48 width x 27 height RGB
            small = cv2.resize(frame, (48, 27))
            small = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
            frames.append(small)
        cap.release()

        n_frames = len(frames)
        if n_frames < 2:
            return []

        frames_arr = np.array(frames, dtype=np.uint8)
        
        # Sliding window buffer: 100 frames window
        pad_len = 50
        padded = np.pad(frames_arr, ((pad_len, pad_len), (0, 0), (0, 0), (0, 0)), mode="edge")

        predictions = []
        batch_size = 100
        for i in range(0, n_frames, batch_size):
            chunk = padded[i : i + batch_size + 2 * pad_len]
            if len(chunk) < 100:
                break
            # TransNetV2 model input tensor name: usually 'input' or session.get_inputs()[0].name
            input_name = self.session.get_inputs()[0].name
            feed_dict = {input_name: chunk[np.newaxis, :100].astype(np.float32)}
            try:
                outputs = self.session.run(None, feed_dict)
                # First output is single frame predictions, second is all transitions
                single_preds = outputs[0][0, pad_len : pad_len + min(batch_size, n_frames - i)]
                predictions.extend(single_preds.squeeze().tolist())
            except Exception as e:
                print(f"[TransNetV2] Inference step failed: {e}")
                break

        # Convert predictions to scene cuts
        scenes: List[Tuple[int, int, float]] = []
        start = 0
        for idx, prob in enumerate(predictions):
            if prob >= threshold and idx - start >= settings.MIN_SCENE_LEN_FRAMES:
                scenes.append((start, idx, float(prob)))
                start = idx + 1

        if start < n_frames:
            scenes.append((start, n_frames - 1, 1.0))

        return scenes
