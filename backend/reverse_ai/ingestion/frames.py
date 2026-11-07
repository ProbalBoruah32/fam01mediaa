"""
FAMONEMEDIA Reverse AI - Frame Extraction & Thumbnail Generation
Extracts representative frames and generates lightweight thumbnails for each detected shot.
"""

from __future__ import annotations
from pathlib import Path
from typing import Optional, List, Tuple
import cv2
import numpy as np


def extract_frame_at_index(video_path: str | Path, frame_idx: int) -> Optional[np.ndarray]:
    """Extract a specific frame from video by its 0-indexed frame number."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    cap.release()
    return frame if ret else None


def extract_frames_at_indices(video_path: str | Path, frame_indices: List[int]) -> List[Tuple[int, np.ndarray]]:
    """Efficient sequential extraction of multiple frame indices in a single pass."""
    results: List[Tuple[int, np.ndarray]] = []
    if not frame_indices:
        return results

    sorted_indices = sorted(list(set(frame_indices)))
    target_set = set(sorted_indices)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return results

    current_idx = 0
    while cap.isOpened() and target_set:
        ret, frame = cap.read()
        if not ret:
            break
        if current_idx in target_set:
            results.append((current_idx, frame))
            target_set.remove(current_idx)
        current_idx += 1

    cap.release()
    return results


def save_thumbnail(
    frame: np.ndarray,
    output_path: str | Path,
    max_width: int = 320,
    quality: int = 85,
) -> str:
    """Resize frame and save as optimized JPEG thumbnail."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    h, w = frame.shape[:2]
    if w > max_width:
        ratio = max_width / float(w)
        new_dim = (max_width, int(h * ratio))
        resized = cv2.resize(frame, new_dim, interpolation=cv2.INTER_AREA)
    else:
        resized = frame

    cv2.imwrite(str(path), resized, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return str(path.resolve())


def generate_clip_assets(
    video_path: str | Path,
    start_frame: int,
    end_frame: int,
    clip_id: str,
    thumbnails_dir: Path,
    frames_dir: Path,
) -> Tuple[str, str]:
    """
    Extracts representative frame (at ~35% into the shot to avoid initial cut blend)
    and saves both high-res representative frame and thumbnail.
    """
    # 35% mark inside the clip duration
    shot_len = max(1, end_frame - start_frame)
    rep_idx = start_frame + int(shot_len * 0.35)

    frame = extract_frame_at_index(video_path, rep_idx)
    if frame is None:
        # Fallback to start frame or middle
        frame = extract_frame_at_index(video_path, start_frame)

    if frame is None:
        # Generate placeholder gray frame if video reading failed
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        frame[:] = (30, 30, 30)

    thumb_file = thumbnails_dir / f"{clip_id}_thumb.jpg"
    rep_file = frames_dir / f"{clip_id}_rep.jpg"

    thumb_path = save_thumbnail(frame, thumb_file, max_width=320, quality=85)
    rep_path = save_thumbnail(frame, rep_file, max_width=1280, quality=90)

    # Return relative URLs for frontend consumption
    thumb_url = f"/api/media/thumbnail/{thumbnails_dir.parent.name}/{thumb_file.name}"
    rep_url = f"/api/media/frame/{frames_dir.parent.name}/{rep_file.name}"

    return thumb_url, rep_url
