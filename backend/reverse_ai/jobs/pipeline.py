"""
FAMONEMEDIA Reverse AI - 10-Step Video Reverse-Engineering Orchestrator
Executes the full pipeline from raw video ingestion to unified multitrack timeline reconstruction
with cancellation checks, thread-safe progress callbacks, and disk persistence.
"""

from __future__ import annotations
import time
from pathlib import Path
from typing import Optional
from backend.reverse_ai.reconstruction.models import (
    Project,
    ClipItem,
    CameraMotion,
    SpeedEstimation,
    ColorProfile,
    VisualSummary,
)
from backend.reverse_ai.jobs.storage import storage_manager
from backend.reverse_ai.jobs.queue import job_manager
from backend.reverse_ai.ingestion.probe import probe_video
from backend.reverse_ai.ingestion.frames import generate_clip_assets, extract_frame_at_index
from backend.reverse_ai.detection.detector_manager import detector_manager
from backend.reverse_ai.visual.visual_manager import visual_manager
from backend.reverse_ai.ocr.ocr_manager import ocr_manager
from backend.reverse_ai.audio.audio_manager import audio_manager
from backend.reverse_ai.audio.beat_sync import evaluate_cut_beat_alignment
from backend.reverse_ai.motion.motion_manager import motion_manager
from backend.reverse_ai.motion.repeated_shots import detect_repeated_clips
from backend.reverse_ai.reconstruction.timeline_builder import build_unified_timeline
from backend.reverse_ai.export.otio_exporter import export_to_otio
from backend.reverse_ai.export.edl_exporter import export_to_edl
from backend.reverse_ai.export.json_exporter import export_to_json
from backend.reverse_ai.export.srt_exporter import export_to_srt
from backend.reverse_ai.export.csv_exporter import export_to_csv


def run_reverse_ai_pipeline(job_id: str, project_id: str, video_path: str) -> None:
    """
    Synchronous worker executing the 10-step reverse-engineering workflow.
    Invoked in a dedicated background worker thread by JobManager.
    """
    v_path = Path(video_path)
    project = storage_manager.load_project(project_id)
    if not project:
        raise ValueError(f"Project not found: {project_id}")

    project.status = "analyzing"
    storage_manager.save_project(project)

    project_dir = storage_manager.get_project_dir(project_id)
    thumbs_dir = storage_manager.get_thumbnails_dir(project_id)
    frames_dir = storage_manager.get_frames_dir(project_id)
    exports_dir = storage_manager.get_exports_dir(project_id)
    wav_path = project_dir / "audio_track.wav"

    def check_cancel():
        if job_manager.is_cancelled(job_id):
            raise InterruptedError("Analysis cancelled by user.")

    try:
        # Step 1: Validate Ingested Media
        job_manager.update_progress(job_id, 1, "Ingesting Media", 10, f"Validating reference video: {v_path.name}")
        check_cancel()
        if not v_path.exists():
            raise FileNotFoundError(f"Video file missing at {v_path}")

        # Step 2: Extract Metadata & Probe Stream
        job_manager.update_progress(job_id, 2, "Probing Streams", 20, "Extracting container, codec, and stream metadata via FFprobe")
        check_cancel()
        metadata = probe_video(v_path)
        project.video_metadata = metadata
        storage_manager.save_project(project)

        # Step 3: Detect Shot Boundaries (TransNetV2 + PySceneDetect)
        job_manager.update_progress(job_id, 3, "Detecting Shot Boundaries", 30, "Running TransNetV2 with PySceneDetect verification")
        check_cancel()
        raw_shots = detector_manager.detect_boundaries(
            video_path=v_path,
            metadata=metadata,
            progress_callback=lambda msg: job_manager.update_progress(job_id, 3, "Detecting Boundaries", 35, msg),
        )

        # Step 4: Refine Timestamps to Frame Precision
        job_manager.update_progress(job_id, 4, "Refining Timestamps", 40, f"Snapping {len(raw_shots)} shot cuts to frame-precision boundaries")
        check_cancel()

        # Step 5: Generate Clip Inventory & Thumbnails
        job_manager.update_progress(job_id, 5, "Building Clip Inventory", 50, "Extracting representative frames and rendering thumbnails")
        check_cancel()
        clips: list[ClipItem] = []
        clip_dict_records = []

        for idx, shot in enumerate(raw_shots):
            check_cancel()
            clip_id = f"clip_{idx + 1:03d}"
            s_frame = shot["start_frame"]
            e_frame = shot["end_frame"]

            thumb_url, rep_url = generate_clip_assets(
                video_path=v_path,
                start_frame=s_frame,
                end_frame=e_frame,
                clip_id=clip_id,
                thumbnails_dir=thumbs_dir,
                frames_dir=frames_dir,
            )

            clip_item = ClipItem(
                id=clip_id,
                index=idx + 1,
                start_frame=s_frame,
                end_frame=e_frame,
                start_time=shot["start_time"],
                end_time=shot["end_time"],
                duration=shot["duration"],
                thumbnail_url=thumb_url,
                representative_frame_url=rep_url,
                boundary_confidence=shot["confidence"],
                detector_source=shot["source"],
                is_boundary_fact=True,
            )
            clips.append(clip_item)
            clip_dict_records.append({
                "id": clip_id,
                "start_frame": s_frame,
                "end_frame": e_frame,
                "perceptual_hash": None,
                "is_repeated_footage": False,
                "repeated_clip_id": None,
            })

        # Step 6: Visual & OCR Clip Analysis
        job_manager.update_progress(job_id, 6, "Visual & OCR Analysis", 60, "Running Qwen visual understanding & PP-OCR on-screen text detection")
        check_cancel()
        for idx, clip in enumerate(clips):
            check_cancel()
            # Read representative frame
            rep_img = extract_frame_at_index(v_path, clip.start_frame + int((clip.end_frame - clip.start_frame) * 0.35))
            if rep_img is not None:
                clip.visual_summary = visual_manager.analyze_frame(rep_img)

            # Detect on-screen text overlays
            clip.text_overlays = ocr_manager.analyze_clip_text(
                video_path=v_path,
                start_frame=clip.start_frame,
                end_frame=clip.end_frame,
                fps=metadata.fps,
            )

        # Step 7: Audio Analysis (Whisper & Librosa)
        job_manager.update_progress(job_id, 7, "Audio & Speech Analysis", 70, "Extracting WAV, transcribing with Whisper, tracking beats with Librosa")
        check_cancel()
        audio_summary, transcript = audio_manager.process_audio(
            video_path=v_path,
            output_wav_path=wav_path,
            fps=metadata.fps,
            progress_callback=lambda msg: job_manager.update_progress(job_id, 7, "Audio Analysis", 72, msg),
        )

        # Step 8: Motion, Camera Movement, Transitions & Repeated Footage
        job_manager.update_progress(job_id, 8, "Estimating Motion & Transitions", 80, "Classifying Pan/Tilt/Zoom, Dissolves/Fades, and matching duplicate shots")
        check_cancel()
        for idx, clip in enumerate(clips):
            check_cancel()
            rep_img = extract_frame_at_index(v_path, clip.start_frame + int((clip.end_frame - clip.start_frame) * 0.35))
            motion_res = motion_manager.analyze_clip_motion_and_effects(
                video_path=v_path,
                start_frame=clip.start_frame,
                end_frame=clip.end_frame,
                fps=metadata.fps,
                rep_frame=rep_img,
            )

            clip.camera_motion = motion_res["camera_motion"]
            clip.speed_estimation = motion_res["speed_estimation"]
            clip.color_profile = motion_res["color_profile"]
            clip.transition_in = motion_res["transition_in"]
            clip.transition_in_duration = motion_res["transition_in_duration"]
            clip.perceptual_hash = motion_res["perceptual_hash"]
            clip_dict_records[idx]["perceptual_hash"] = motion_res["perceptual_hash"]

            # Musical beat alignment
            if audio_summary.beats:
                align_score, delta_sec = evaluate_cut_beat_alignment(clip.start_time, audio_summary.beats)
                clip.beat_alignment_score = align_score
                clip.nearest_beat_delta_sec = delta_sec

        # Detect repeated footage
        detect_repeated_clips(clip_dict_records)
        for idx, rec in enumerate(clip_dict_records):
            clips[idx].is_repeated_footage = rec["is_repeated_footage"]
            clips[idx].repeated_clip_id = rec["repeated_clip_id"]

        # Step 9: Assemble Unified Event Timeline
        job_manager.update_progress(job_id, 9, "Building Unified Timeline", 90, "Merging detected facts & inferred effects into 4-track timeline")
        check_cancel()
        timeline = build_unified_timeline(
            project_id=project_id,
            metadata=metadata,
            clips=clips,
            audio_summary=audio_summary,
            transcript=transcript,
        )
        project.timeline = timeline
        project.status = "completed"
        storage_manager.save_project(project)

        # Step 10: Generate Interchange Exports (OTIO, EDL, JSON, SRT, CSV)
        job_manager.update_progress(job_id, 10, "Generating Exports", 98, "Writing OpenTimelineIO, CMX 3600 EDL, JSON, SRT, and CSV files")
        check_cancel()
        export_to_otio(timeline, exports_dir / f"{project_id}.otio")
        export_to_edl(timeline, exports_dir / f"{project_id}.edl")
        export_to_json(timeline, exports_dir / f"{project_id}.json")
        export_to_srt(transcript, exports_dir / f"{project_id}.srt")
        export_to_csv(timeline, exports_dir / f"{project_id}.csv")

        job_manager.update_progress(job_id, 10, "Completed", 100, f"Analysis finished. {len(clips)} shots reconstructed successfully.")

    except InterruptedError:
        project.status = "created"
        storage_manager.save_project(project)
        job_manager.update_progress(job_id, 0, "Cancelled", 0, "Analysis was cancelled by user.")
    except Exception as e:
        project.status = "failed"
        project.error_message = str(e)
        storage_manager.save_project(project)
        raise e
