"""
FAMONEMEDIA Reverse AI - Unified Audio Pipeline Manager
Extracts audio, transcribes speech with Whisper, tracks musical tempo/beats with Librosa,
and evaluates edit beat synchronization.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Callable
from backend.reverse_ai.reconstruction.models import AudioAnalysisSummary, SubtitleLine, AudioBeat
from backend.reverse_ai.ingestion.audio_extract import extract_audio_wav
from backend.reverse_ai.audio.whisper_transcriber import whisper_transcriber
from backend.reverse_ai.audio.librosa_analyzer import analyze_audio_beats_and_tempo
from backend.reverse_ai.audio.beat_sync import evaluate_cut_beat_alignment


class AudioManager:
    def __init__(self):
        self.transcriber = whisper_transcriber

    def process_audio(
        self,
        video_path: str | Path,
        output_wav_path: str | Path,
        fps: float,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> Tuple[AudioAnalysisSummary, List[SubtitleLine]]:
        """
        Extracts audio and executes speech transcription + beat analysis.
        """
        if progress_callback:
            progress_callback("Extracting 16kHz PCM audio stream...")

        wav_path = extract_audio_wav(video_path, output_wav_path)
        if not wav_path:
            return AudioAnalysisSummary(has_audio=False), []

        # 1. Beat & Tempo Analysis with Librosa
        if progress_callback:
            progress_callback("Running Librosa tempo estimation and musical beat tracking...")
        audio_summary = analyze_audio_beats_and_tempo(wav_path, fps=fps)

        # 2. Speech Transcription with Whisper
        if progress_callback:
            progress_callback("Running Whisper speech-to-text with word timestamp extraction...")
        transcript = self.transcriber.transcribe(wav_path)

        audio_summary.speech_segments_count = len(transcript)
        return audio_summary, transcript


audio_manager = AudioManager()
