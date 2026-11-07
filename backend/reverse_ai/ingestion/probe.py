"""
FAMONEMEDIA Reverse AI - Media Ingestion & Metadata Probing
Extracts precise container and codec stream metadata using FFprobe with fallback to OpenCV.
"""

from __future__ import annotations
import json
import subprocess
from pathlib import Path
from typing import Optional
import cv2
from backend.reverse_ai.reconstruction.models import VideoMetadata


def probe_video(filepath: str | Path) -> VideoMetadata:
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Video file not found at: {path}")

    # Primary probe using ffprobe
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        probe_data = json.loads(res.stdout)
        
        video_stream = None
        audio_stream = None
        for s in probe_data.get("streams", []):
            if s.get("codec_type") == "video" and not video_stream:
                video_stream = s
            elif s.get("codec_type") == "audio" and not audio_stream:
                audio_stream = s

        if not video_stream:
            raise ValueError("No video stream found in the input container.")

        # Parse frame rate
        fps_str = video_stream.get("r_frame_rate", "30/1")
        if "/" in fps_str:
            num, den = fps_str.split("/")
            fps = float(num) / float(den) if float(den) != 0 else 30.0
        else:
            fps = float(fps_str)

        width = int(video_stream.get("width", 1920))
        height = int(video_stream.get("height", 1080))
        aspect_ratio = f"{width}:{height}"
        # Reduce common ratios
        if width > 0 and height > 0:
            import math
            gcd = math.gcd(width, height)
            aspect_ratio = f"{width // gcd}:{height // gcd}"

        # Duration and frame count
        duration = float(probe_data.get("format", {}).get("duration", video_stream.get("duration", 0.0)))
        total_frames = int(video_stream.get("nb_frames", 0))
        if total_frames <= 0 and duration > 0 and fps > 0:
            total_frames = int(duration * fps)

        codec = video_stream.get("codec_name", "unknown")
        bitrate = float(probe_data.get("format", {}).get("bit_rate", 0)) / 1000.0 if probe_data.get("format", {}).get("bit_rate") else None
        file_size_mb = round(path.stat().st_size / (1024 * 1024), 2)

        has_audio = audio_stream is not None
        audio_codec = audio_stream.get("codec_name") if audio_stream else None
        audio_sr = int(audio_stream.get("sample_rate", 0)) if audio_stream else None
        audio_ch = int(audio_stream.get("channels", 0)) if audio_stream else None

        return VideoMetadata(
            filename=path.name,
            filepath=str(path.resolve()),
            duration_sec=round(duration, 3),
            total_frames=total_frames,
            fps=round(fps, 3),
            width=width,
            height=height,
            aspect_ratio=aspect_ratio,
            codec=codec,
            bitrate_kbps=round(bitrate, 1) if bitrate else None,
            file_size_mb=file_size_mb,
            has_audio=has_audio,
            audio_codec=audio_codec,
            audio_sample_rate=audio_sr,
            audio_channels=audio_ch,
        )

    except Exception:
        # Fallback to OpenCV VideoCapture if ffprobe is unavailable or fails
        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video file with OpenCV fallback: {path}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0
        file_size_mb = round(path.stat().st_size / (1024 * 1024), 2)
        cap.release()

        return VideoMetadata(
            filename=path.name,
            filepath=str(path.resolve()),
            duration_sec=round(duration, 3),
            total_frames=total_frames,
            fps=round(fps, 3),
            width=width,
            height=height,
            aspect_ratio=f"{width}:{height}",
            codec="cv2_fallback",
            file_size_mb=file_size_mb,
            has_audio=False,
        )
