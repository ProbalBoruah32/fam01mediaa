"""
FAMONEMEDIA Reverse AI - Audio Tempo & Beat Analysis
Analyzes tempo (BPM), musical beat grid, and RMS energy envelope using Librosa and SoundFile.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
import soundfile as sf
import librosa
from backend.app.config import settings
from backend.reverse_ai.reconstruction.models import AudioAnalysisSummary, AudioBeat


def analyze_audio_beats_and_tempo(
    audio_wav_path: str | Path,
    fps: float = 30.0,
) -> AudioAnalysisSummary:
    """
    Computes BPM, beat positions, and energy envelope from audio WAV.
    """
    path = Path(audio_wav_path)
    if not path.exists() or path.stat().st_size <= 44:
        return AudioAnalysisSummary(has_audio=False)

    try:
        # Load audio using soundfile for high speed
        y, sr = sf.read(str(path))
        if y.ndim > 1:
            y = np.mean(y, axis=1)  # Ensure mono

        if len(y) == 0:
            return AudioAnalysisSummary(has_audio=False)

        # Standardize sample rate if needed
        if sr != settings.AUDIO_SAMPLE_RATE:
            y = librosa.resample(y, orig_sr=sr, target_sr=settings.AUDIO_SAMPLE_RATE)
            sr = settings.AUDIO_SAMPLE_RATE

        # Compute tempo and beat frames
        tempo, beat_frames = librosa.beat.beat_track(
            y=y,
            sr=sr,
            hop_length=settings.LIBROSA_HOP_LENGTH,
        )
        
        # Handle scalar or array tempo in newer librosa versions
        tempo_bpm = float(tempo[0]) if isinstance(tempo, (np.ndarray, list)) else float(tempo)

        # Convert beat frames to seconds
        beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=settings.LIBROSA_HOP_LENGTH)

        # Calculate RMS energy for loudness curve
        rms = librosa.feature.rms(y=y, hop_length=settings.LIBROSA_HOP_LENGTH)[0]
        mean_rms = float(np.mean(rms)) if len(rms) > 0 else 0.0

        # Construct AudioBeat list
        beats: List[AudioBeat] = []
        for idx, t in enumerate(beat_times):
            frame_idx = int(round(t * fps))
            is_downbeat = (idx % 4 == 0)  # Standard 4/4 meter assumption
            beats.append(
                AudioBeat(
                    time_sec=round(float(t), 3),
                    frame_index=frame_idx,
                    strength=1.0 if is_downbeat else 0.7,
                    is_downbeat=is_downbeat,
                )
            )

        return AudioAnalysisSummary(
            has_audio=True,
            tempo_bpm=round(tempo_bpm, 1),
            beat_count=len(beats),
            beats=beats,
            rms_energy_mean=round(mean_rms, 4),
            speech_segments_count=0,
        )

    except Exception as e:
        print(f"[Librosa] Audio analysis failed: {e}")
        return AudioAnalysisSummary(has_audio=False)
