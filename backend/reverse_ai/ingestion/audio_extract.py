"""
FAMONEMEDIA Reverse AI - Audio Track Extraction
Extracts 16kHz mono PCM WAV from input video containers using FFmpeg.
"""

from __future__ import annotations
import subprocess
from pathlib import Path
from typing import Optional


def extract_audio_wav(
    video_path: str | Path,
    output_wav_path: str | Path,
    sample_rate: int = 16000,
) -> Optional[str]:
    """
    Extracts audio to 16kHz 16-bit mono PCM WAV for Whisper and Librosa analysis.
    Returns the resolved path if audio exists and was extracted, None otherwise.
    """
    v_path = Path(video_path)
    out_path = Path(output_wav_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(v_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-ac", "1",
        str(out_path),
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and out_path.exists() and out_path.stat().st_size > 44:
            return str(out_path.resolve())
        return None
    except Exception:
        return None
