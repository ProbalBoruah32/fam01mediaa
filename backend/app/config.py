"""
FAMONEMEDIA Reverse AI - Application Configuration
Centralized configuration with hardware detection, configurable thresholds,
model paths, and CPU-only optimization defaults.
"""

from __future__ import annotations
import os
import psutil
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Base paths
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = PROJECT_ROOT / "storage"
    OUTPUTS_DIR: Path = PROJECT_ROOT / "outputs"
    MODELS_DIR: Path = PROJECT_ROOT / "models"

    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # CPU & Hardware optimization
    NUM_WORKERS: int = max(1, os.cpu_count() or 4)
    MAX_CPU_THREADS: int = min(8, max(1, os.cpu_count() or 4))
    LOW_MEMORY_MODE: bool = False

    # Shot boundary detection
    TRANSNET_MODEL_PATH: Path = MODELS_DIR / "transnetv2" / "transnetv2.onnx"
    TRANSNET_THRESHOLD: float = 0.5
    SCENEDETECT_THRESHOLD: float = 27.0
    SCENEDETECT_ADAPTIVE_THRESHOLD: float = 3.0
    MIN_SCENE_LEN_FRAMES: int = 8
    FRAME_SNAPPING_TOLERANCE: int = 3

    # Visual understanding (Qwen2.5-VL-3B-Instruct)
    QWEN_MODEL_DIR: Path = MODELS_DIR / "qwen2.5-vl-3b"
    QWEN_DEVICE: str = "cpu"
    QWEN_MAX_TOKENS: int = 256
    ENABLE_QWEN: bool = True  # Fallback to heuristic if weights missing

    # On-screen text detection (PP-OCRv6 / RapidOCR)
    OCR_ENGINE: str = "rapidocr"  # rapidocr (onnx cpu) | paddleocr | heuristic
    OCR_CONFIDENCE_THRESHOLD: float = 0.5
    OCR_SAMPLE_FPS: float = 1.0  # Sample 1 frame per second per clip

    # Audio analysis & speech transcription
    WHISPER_MODEL_SIZE: str = "tiny"  # tiny | base | small (tiny default for fast CPU)
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    AUDIO_SAMPLE_RATE: int = 16000
    LIBROSA_HOP_LENGTH: int = 512

    # Motion & optical flow analysis
    OPTICAL_FLOW_STEP: int = 2  # Evaluate optical flow every N frames
    MOTION_THRESHOLD: float = 1.5
    ZOOM_THRESHOLD: float = 0.08
    PAN_THRESHOLD: float = 1.2
    REPEATED_SHOT_HASH_THRESHOLD: int = 10  # Hamming distance for perceptual hash

    # Job settings
    MAX_CONCURRENT_JOBS: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Ensure standard working directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
(settings.MODELS_DIR / "transnetv2").mkdir(parents=True, exist_ok=True)
(settings.MODELS_DIR / "qwen2.5-vl-3b").mkdir(parents=True, exist_ok=True)
(settings.MODELS_DIR / "whisper").mkdir(parents=True, exist_ok=True)


def get_hardware_info() -> dict:
    """Return local Windows hardware inspection details for CPU, RAM, and Disk."""
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(str(settings.PROJECT_ROOT))
    
    return {
        "cpu_count_physical": psutil.cpu_count(logical=False) or 4,
        "cpu_count_logical": psutil.cpu_count(logical=True) or 8,
        "cpu_percent": psutil.cpu_percent(interval=None),
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "ram_available_gb": round(mem.available / (1024**3), 2),
        "ram_used_percent": mem.percent,
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "disk_used_percent": disk.percent,
        "platform": "windows",
        "device": "cpu",
        "cuda_available": False,
        "ffmpeg_available": True,
    }
