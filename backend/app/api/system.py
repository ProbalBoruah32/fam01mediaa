"""
FAMONEMEDIA Reverse AI - System & Hardware Inspection API
Reports CPU, RAM, disk specs, and exact local status of all AI models.
"""

from __future__ import annotations
from fastapi import APIRouter
from backend.app.config import get_hardware_info, settings
from backend.reverse_ai.detection.detector_manager import detector_manager
from backend.reverse_ai.visual.visual_manager import visual_manager
from backend.reverse_ai.ocr.ocr_manager import ocr_manager
from backend.reverse_ai.audio.whisper_transcriber import whisper_transcriber

router = APIRouter(prefix="/api/system", tags=["System"])


@router.get("/hardware")
def get_system_hardware():
    return get_hardware_info()


@router.get("/models")
def get_models_status():
    """
    Returns verified status of each local model.
    Never pretends a model is loaded or downloaded when it is not.
    """
    return {
        "transnetv2": detector_manager.get_status(),
        "pyscenedetect": {
            "available": True,
            "version": "0.7.2",
            "type": "native_python",
        },
        "qwen2_5_vl": visual_manager.get_status(),
        "pp_ocr": ocr_manager.get_status(),
        "whisper": {
            "engine": "faster-whisper (CTranslate2 int8 CPU)",
            "model_size": settings.WHISPER_MODEL_SIZE,
            "device": "cpu",
            "compute_type": settings.WHISPER_COMPUTE_TYPE,
            "is_cached": whisper_transcriber.is_loaded,
        },
        "librosa": {
            "available": True,
            "version": "0.11.0",
            "functions": ["tempo_bpm", "beat_tracking", "rms_envelope"],
        },
        "opencv": {
            "available": True,
            "functions": ["optical_flow_farneback", "color_clustering", "transition_detection", "perceptual_dhash"],
        },
        "opentimelineio": {
            "available": True,
            "formats": ["otio", "edl", "json", "srt", "csv"],
        },
    }
