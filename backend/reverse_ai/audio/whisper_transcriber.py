"""
FAMONEMEDIA Reverse AI - Speech Transcription Engine
Locally runs Whisper on CPU using int8 quantization with word-level timestamps.
Includes graceful fallback if audio track contains no speech.
"""

from __future__ import annotations
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.app.config import settings
from backend.reverse_ai.reconstruction.models import SubtitleLine, WordTimestamp


class WhisperTranscriber:
    def __init__(
        self,
        model_size: str = settings.WHISPER_MODEL_SIZE,
        device: str = settings.WHISPER_DEVICE,
        compute_type: str = settings.WHISPER_COMPUTE_TYPE,
    ):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.model = None
        self.is_loaded = False
        self.whisper_dir = settings.MODELS_DIR / "whisper"

    def _ensure_loaded(self) -> bool:
        if self.is_loaded and self.model is not None:
            return True

        try:
            from faster_whisper import WhisperModel
            # Download/load model into local models/whisper cache
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
                download_root=str(self.whisper_dir),
                cpu_threads=settings.MAX_CPU_THREADS,
            )
            self.is_loaded = True
            return True
        except Exception as e:
            print(f"[Whisper] Failed to initialize faster-whisper: {e}")
            self.is_loaded = False
            return False

    def is_available(self) -> bool:
        return True  # Can lazy load when needed

    def transcribe(self, audio_wav_path: str | Path) -> List[SubtitleLine]:
        """
        Transcribes speech from 16kHz WAV audio. Returns list of SubtitleLine domain objects.
        """
        path = Path(audio_wav_path)
        if not path.exists() or path.stat().st_size <= 44:
            return []

        if not self._ensure_loaded():
            return []

        lines: List[SubtitleLine] = []
        try:
            segments, info = self.model.transcribe(
                str(path),
                beam_size=3,
                word_timestamps=True,
                vad_filter=True,  # Voice activity detector filters out non-speech noise
            )

            for idx, seg in enumerate(segments):
                words = []
                if seg.words:
                    for w in seg.words:
                        words.append(
                            WordTimestamp(
                                word=w.word.strip(),
                                start_sec=round(w.start, 3),
                                end_sec=round(w.end, 3),
                                probability=round(w.probability, 3),
                            )
                        )

                text = seg.text.strip()
                if text:
                    confidence = float(np.exp(seg.avg_logprob)) if hasattr(seg, "avg_logprob") else 0.95
                    confidence = min(1.0, max(0.1, confidence))
                    lines.append(
                        SubtitleLine(
                            id=f"sub_{idx+1:03d}",
                            start_sec=round(seg.start, 3),
                            end_sec=round(seg.end, 3),
                            text=text,
                            confidence=round(confidence, 3),
                            words=words,
                            is_inferred=False,  # Detected fact
                        )
                    )
        except Exception as e:
            print(f"[Whisper] Transcription error: {e}")

        return lines


whisper_transcriber = WhisperTranscriber()
