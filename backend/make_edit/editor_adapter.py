"""
FAMONEMEDIA Make Your Edit - Editor & OpenCut Classic Adapter
Translates Make Your Edit ComponentManifest into OpenCut Classic timeline format
and OpenTimelineIO interchange format for external NLE compatibility.
"""

from __future__ import annotations
from typing import Dict, Any, List
from pathlib import Path
from backend.make_edit.models import ComponentManifest, ComponentItem


def manifest_to_opencut_format(manifest: ComponentManifest) -> Dict[str, Any]:
    """
    Translates ComponentManifest into OpenCut Classic compatible project schema.
    OpenCut Classic uses tracks: [{ id, name, type, elements: [{ id, name, type, start, duration, ... }] }]
    """
    fps = manifest.fps
    width = manifest.width
    height = manifest.height

    # Construct OpenCut tracks
    tracks: Dict[str, List[Dict[str, Any]]] = {
        "video": [],
        "text": [],
        "audio": [],
        "effects": [],
    }

    for comp in manifest.components:
        if comp.status == "removed":
            continue

        # Determine effective source media
        is_replaced = comp.status == "replaced" and comp.replacement is not None
        source_url = comp.replacement.media_url if is_replaced else (comp.original_asset_ref or comp.preview_url)

        elem: Dict[str, Any] = {
            "id": comp.id,
            "name": comp.title,
            "category": comp.category,
            "subtype": comp.subtype,
            "start": round(comp.start_time, 3),
            "end": round(comp.end_time, 3),
            "duration": round(comp.duration, 3),
            "status": comp.status,
            "source": source_url,
            "properties": {
                **comp.intrinsic_properties,
                "fit_mode": comp.replacement.fit_mode if is_replaced else "crop",
                "volume": comp.replacement.volume if is_replaced else 1.0,
                "speed": comp.replacement.playback_speed if is_replaced else 1.0,
                "text": comp.replacement.replacement_text if (is_replaced and comp.replacement.replacement_text) else comp.intrinsic_properties.get("original_text", ""),
            },
        }

        if comp.category == "video_clip":
            tracks["video"].append(elem)
        elif comp.category in ["text_component", "image_graphic"]:
            tracks["text"].append(elem)
        elif comp.category == "audio_component":
            tracks["audio"].append(elem)
        elif comp.category in ["effect", "transition"]:
            tracks["effects"].append(elem)

    return {
        "format": "opencut_classic_v1",
        "projectId": manifest.project_id,
        "sourceReverseId": manifest.source_reverse_ai_project_id,
        "canvas": {
            "width": width,
            "height": height,
            "fps": fps,
            "duration": manifest.total_duration_sec,
            "aspectRatio": manifest.aspect_ratio,
        },
        "tracks": [
            {"id": "track_video_1", "name": "V1: Video Cuts", "type": "video", "elements": tracks["video"]},
            {"id": "track_text_1", "name": "V2: Text & Overlays", "type": "text", "elements": tracks["text"]},
            {"id": "track_audio_1", "name": "A1: Audio & Dialogue", "type": "audio", "elements": tracks["audio"]},
            {"id": "track_fx_1", "name": "FX: Camera & Transitions", "type": "effects", "elements": tracks["effects"]},
        ],
    }


def manifest_to_otio_format(manifest: ComponentManifest, output_filepath: str | Path) -> str:
    """
    Exports manifest to OpenTimelineIO (.otio) format.
    """
    import opentimelineio as otio
    out_path = Path(output_filepath)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fps = manifest.fps

    timeline = otio.schema.Timeline(name=f"MakeYourEdit_{manifest.project_id}")
    video_track = otio.schema.Track(name="V1: Replaced Video", kind=otio.schema.TrackKind.Video)

    for comp in manifest.components:
        if comp.category != "video_clip" or comp.status == "removed":
            continue

        start_frame = int(round(comp.start_time * fps))
        dur_frames = max(1, int(round(comp.duration * fps)))

        source_range = otio.opentime.TimeRange(
            start_time=otio.opentime.RationalTime(start_frame, fps),
            duration=otio.opentime.RationalTime(dur_frames, fps),
        )

        media_url = (
            comp.replacement.media_url
            if comp.status == "replaced" and comp.replacement and comp.replacement.media_url
            else comp.original_asset_ref or ""
        )

        media_ref = otio.schema.ExternalReference(target_url=media_url, available_range=source_range)
        clip = otio.schema.Clip(name=comp.title, media_reference=media_ref, source_range=source_range)

        clip.metadata["make_edit"] = {
            "component_id": comp.id,
            "status": comp.status,
            "fit_mode": comp.replacement.fit_mode if comp.replacement else "crop",
        }
        video_track.append(clip)

    timeline.tracks.append(video_track)
    otio.adapters.write_to_file(timeline, str(out_path))
    return str(out_path.resolve())
