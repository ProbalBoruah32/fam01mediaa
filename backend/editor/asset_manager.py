"""
FAMONEMEDIA Central Asset Manager
Handles media ingestion, FFprobe metadata extraction, thumbnail generation,
and waveform peak calculation for videos, images, and audio files.
"""

from __future__ import annotations
import os
import uuid
import json
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from backend.database.models import DBAsset
from backend.database.db import SessionLocal
from backend.app.config import settings


ASSETS_DIR = settings.STORAGE_DIR / "asset_library"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
THUMBS_DIR = ASSETS_DIR / "thumbnails"
THUMBS_DIR.mkdir(parents=True, exist_ok=True)


def extract_media_metadata(file_path: Path) -> Dict[str, Any]:
    """Runs ffprobe to retrieve duration, dimensions, framerate, and stream types."""
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration,size,bit_rate:stream=width,height,codec_type,r_frame_rate,sample_rate,channels",
            "-of", "json",
            str(file_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        
        fmt = data.get("format", {})
        duration = float(fmt.get("duration", 0.0))
        file_size = int(fmt.get("size", file_path.stat().st_size if file_path.exists() else 0))

        width, height = 0, 0
        media_type = "video"
        has_video = False
        has_audio = False

        for s in data.get("streams", []):
            ctype = s.get("codec_type")
            if ctype == "video":
                has_video = True
                width = int(s.get("width", 0))
                height = int(s.get("height", 0))
            elif ctype == "audio":
                has_audio = True

        ext = file_path.suffix.lower()
        if ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"]:
            media_type = "image"
            if duration <= 0:
                duration = 5.0
        elif has_video:
            media_type = "video"
        elif has_audio:
            media_type = "audio"

        return {
            "duration_sec": duration,
            "width": width,
            "height": height,
            "file_size_bytes": file_size,
            "media_type": media_type,
        }
    except Exception as e:
        print(f"[AssetManager] ffprobe failed for {file_path.name}: {e}")
        return {
            "duration_sec": 5.0,
            "width": 1920,
            "height": 1080,
            "file_size_bytes": file_path.stat().st_size if file_path.exists() else 0,
            "media_type": "video",
        }


def generate_video_thumbnail(file_path: Path, thumb_path: Path) -> bool:
    """Extracts a frame at 1s or midpoint as a thumbnail image."""
    try:
        cmd = [
            "ffmpeg", "-y",
            "-ss", "00:00:01",
            "-i", str(file_path),
            "-vframes", "1",
            "-vf", "scale=320:-1",
            "-q:v", "3",
            str(thumb_path),
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        return thumb_path.exists()
    except Exception:
        # Fallback to 0s
        try:
            cmd = [
                "ffmpeg", "-y",
                "-ss", "00:00:00",
                "-i", str(file_path),
                "-vframes", "1",
                "-vf", "scale=320:-1",
                "-q:v", "3",
                str(thumb_path),
            ]
            subprocess.run(cmd, capture_output=True, check=True)
            return thumb_path.exists()
        except Exception:
            return False


def generate_audio_waveform(file_path: Path, points: int = 80) -> List[float]:
    """Generates a compact array of normalized audio amplitude peaks."""
    try:
        import numpy as np
        # Extract 8kHz raw mono audio
        cmd = [
            "ffmpeg", "-y",
            "-i", str(file_path),
            "-ac", "1",
            "-ar", "8000",
            "-f", "f32le",
            "-"
        ]
        proc = subprocess.run(cmd, capture_output=True, check=True)
        samples = np.frombuffer(proc.stdout, dtype=np.float32)
        if len(samples) == 0:
            return [0.1] * points

        # Group into bins and find max peak per bin
        chunk_size = max(1, len(samples) // points)
        peaks = []
        for i in range(points):
            chunk = samples[i * chunk_size : (i + 1) * chunk_size]
            if len(chunk) > 0:
                peak = float(np.max(np.abs(chunk)))
                peaks.append(round(min(peak, 1.0), 3))
            else:
                peaks.append(0.0)

        max_val = max(peaks) if max(peaks) > 0 else 1.0
        return [round(p / max_val, 3) for p in peaks]
    except Exception as e:
        print(f"[AssetManager] Waveform generation failed: {e}")
        # Return generic waveform
        return [0.2, 0.4, 0.7, 0.9, 0.6, 0.3, 0.5, 0.8, 0.4, 0.2] * (points // 10)


def ingest_media_file(src_path: Path, original_filename: str) -> DBAsset:
    """Copies file into central asset library, extracts metadata, and saves to database."""
    asset_id = f"ast_{uuid.uuid4().hex[:8]}"
    safe_name = f"{asset_id}_{original_filename.replace(' ', '_')}"
    dest_path = ASSETS_DIR / safe_name
    shutil.copy2(src_path, dest_path)

    meta = extract_media_metadata(dest_path)

    # Thumbnail
    thumb_url = None
    if meta["media_type"] == "video":
        thumb_name = f"{asset_id}_thumb.jpg"
        thumb_path = THUMBS_DIR / thumb_name
        if generate_video_thumbnail(dest_path, thumb_path):
            thumb_url = f"/api/editor/assets/thumb/{thumb_name}"
    elif meta["media_type"] == "image":
        thumb_url = f"/api/editor/assets/file/{safe_name}"

    # Waveform (if audio or video)
    waveform_json = None
    if meta["media_type"] in ["audio", "video"]:
        peaks = generate_audio_waveform(dest_path)
        waveform_json = json.dumps(peaks)

    db: Session = SessionLocal()
    try:
        db_asset = DBAsset(
            id=asset_id,
            name=original_filename,
            filename=safe_name,
            file_path=str(dest_path.resolve()),
            media_url=f"/api/editor/assets/file/{safe_name}",
            media_type=meta["media_type"],
            duration_sec=meta["duration_sec"],
            width=meta["width"],
            height=meta["height"],
            file_size_bytes=meta["file_size_bytes"],
            thumbnail_url=thumb_url,
            waveform_json=waveform_json,
        )
        db.add(db_asset)
        db.commit()
        db.refresh(db_asset)
        return db_asset
    finally:
        db.close()
