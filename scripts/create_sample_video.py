"""
FAMONEMEDIA Reverse AI - Synthetic Reference Video Generator
Creates a multi-scene reference MP4 with distinct shot types, transitions,
on-screen text overlays, motion, and a synchronized audio track for testing.
"""

from __future__ import annotations
import math
import subprocess
from pathlib import Path
import cv2
import numpy as np


def generate_test_video(output_mp4: str | Path, duration_sec: int = 12, fps: int = 24) -> str:
    out_path = Path(output_mp4)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    temp_silent = out_path.with_name("temp_silent.mp4")
    temp_wav = out_path.with_name("temp_audio.wav")

    width, height = 1280, 720
    total_frames = duration_sec * fps

    # Scene definitions (frame ranges and visual traits)
    # Scene 1: 0 to 3s (0-72 frames): Dark Studio Tech Intro with Title
    # Scene 2: 3 to 6s (72-144 frames): Warm Sunset Outdoor Pan with Lower Third
    # Scene 3: 6 to 9s (144-216 frames): Neon Cyberpunk Close-Up with Fast Motion
    # Scene 4: 9 to 12s (216-288 frames): White Commercial Product Shot
    scenes = [
        {"start": 0, "end": 72, "bg": (20, 20, 30), "title": "FAMONE REVERSE AI", "sub": "Autonomous Timeline Deconstruction"},
        {"start": 72, "end": 144, "bg": (40, 90, 180), "title": "CHAPTER 1: INGESTION", "sub": "Reference Media Extracted"},
        {"start": 144, "end": 216, "bg": (120, 30, 120), "title": "OPTICAL FLOW SENSING", "sub": "Tracking Camera Trajectory"},
        {"start": 216, "end": 288, "bg": (220, 220, 220), "title": "TIMELINE SYNCHRONIZED", "sub": "Ready for OpenTimelineIO Export"},
    ]

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(temp_silent), fourcc, fps, (width, height))

    for f in range(total_frames):
        # Identify active scene
        active_scene = scenes[-1]
        for s in scenes:
            if s["start"] <= f < s["end"]:
                active_scene = s
                break

        # Base background
        base_color = np.array(active_scene["bg"], dtype=np.float32)
        
        # Subtle horizontal motion gradient
        x = np.linspace(0, 1, width)
        y = np.linspace(0, 1, height)
        xx, _ = np.meshgrid(x, y)
        
        motion_shift = math.sin((f % 72) * 0.1) * 20.0
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :] = np.clip(base_color + motion_shift, 0, 255).astype(np.uint8)

        # Draw a moving shape (to simulate object / camera motion)
        cx = int(width * 0.5 + math.sin(f * 0.08) * 180)
        cy = int(height * 0.55 + math.cos(f * 0.08) * 40)
        shape_color = (255 - active_scene["bg"][0], 255 - active_scene["bg"][1], 255 - active_scene["bg"][2])
        cv2.circle(frame, (cx, cy), 60, shape_color, -1)

        # Text banner
        font = cv2.FONT_HERSHEY_DUPLEX
        cv2.putText(frame, active_scene["title"], (100, 140), font, 1.4, (255, 255, 255), 3, cv2.LINE_AA)
        cv2.putText(frame, active_scene["sub"], (100, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (200, 240, 200), 2, cv2.LINE_AA)
        
        # Lower-third watermark
        cv2.putText(frame, f"REC 00:00:{f//fps:02d};{f%fps:02d}", (100, 640), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 180, 180), 2, cv2.LINE_AA)

        writer.write(frame)

    writer.release()

    # Generate synthetic audio tone with periodic rhythmic beeps (120 BPM = 2 beats per sec)
    sample_rate = 16000
    n_samples = duration_sec * sample_rate
    t = np.linspace(0, duration_sec, n_samples, False)
    
    # 220Hz fundamental carrier
    audio = 0.15 * np.sin(2 * np.pi * 220 * t)
    
    # 120 BPM beat clicks at every 0.5s (880Hz beep for 50ms)
    beat_interval = int(0.5 * sample_rate)
    for b in range(0, n_samples, beat_interval):
        click_len = min(int(0.05 * sample_rate), n_samples - b)
        audio[b : b + click_len] += 0.4 * np.sin(2 * np.pi * 880 * np.linspace(0, 0.05, click_len, False))

    audio = np.clip(audio, -1.0, 1.0)
    audio_int16 = (audio * 32767).astype(np.int16)

    # Write WAV using Python's built-in wave module
    import wave
    with wave.open(str(temp_wav), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_int16.tobytes())

    # Mux video + audio using FFmpeg
    mux_cmd = [
        "ffmpeg", "-y",
        "-i", str(temp_silent),
        "-i", str(temp_wav),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        str(out_path),
    ]
    subprocess.run(mux_cmd, capture_output=True, check=True)

    # Clean up temp files
    if temp_silent.exists():
        temp_silent.unlink()
    if temp_wav.exists():
        temp_wav.unlink()

    return str(out_path.resolve())


if __name__ == "__main__":
    test_file = Path("storage") / "sample_reference.mp4"
    print(f"Generating synthetic reference video at {test_file}...")
    created = generate_test_video(test_file)
    print(f"Generated successfully: {created}")
