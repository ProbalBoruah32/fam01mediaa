"""
FAMONEMEDIA Make Your Edit - Component Manifest Generator
Consumes completed Reverse AI analysis data in read-only mode and synthesizes
a standardized, versioned 7-category ComponentManifest.
"""

from __future__ import annotations
from typing import Dict, Any, List
from datetime import datetime
from backend.make_edit.models import (
    ComponentItem,
    ComponentManifest,
    ComponentCategory,
    ComponentSubtype,
)


def generate_component_manifest(
    make_edit_project_id: str,
    reverse_ai_analysis_data: Dict[str, Any],
) -> ComponentManifest:
    """
    Parses completed Reverse AI timeline data into a granular, structured
    component inventory covering all 7 categories with stable unique IDs.
    """
    timeline = reverse_ai_analysis_data.get("timeline") or {}
    metadata = timeline.get("video_metadata") or reverse_ai_analysis_data.get("video_metadata") or {}
    reverse_proj_id = reverse_ai_analysis_data.get("id", "unknown_source")

    fps = float(metadata.get("fps") or timeline.get("fps") or 24.0)
    width = int(metadata.get("width") or 1920)
    height = int(metadata.get("height") or 1080)
    aspect_ratio = str(metadata.get("aspect_ratio") or f"{width}:{height}")
    duration = float(timeline.get("total_duration_sec") or metadata.get("duration_sec") or 0.0)

    components: List[ComponentItem] = []

    # Category counters for manifest summary
    counts: Dict[str, int] = {
        "video_clip": 0,
        "image_graphic": 0,
        "text_component": 0,
        "audio_component": 0,
        "transition": 0,
        "effect": 0,
        "timeline_metadata": 0,
    }

    # 1. Timeline Metadata Component (Container Specs)
    meta_comp = ComponentItem(
        id=f"cmp_meta_{make_edit_project_id[:6]}",
        category="timeline_metadata",
        subtype="stream_container",
        title=f"Sequence Container ({width}x{height} @ {fps:.1f}fps)",
        description=(
            f"Reference media: {metadata.get('filename', 'video')}. "
            f"Codec: {metadata.get('codec', 'h264')}, Aspect: {aspect_ratio}, Duration: {duration:.2f}s."
        ),
        start_time=0.0,
        end_time=duration,
        duration=duration,
        track_id="track_meta",
        is_replaceable=False,
        is_editable=False,
        is_locked=True,
        confidence=1.0,
        evidence="Direct container stream probe via FFprobe",
        original_asset_ref=metadata.get("filepath"),
        compatible_replacement_types=[],
        intrinsic_properties={
            "width": width,
            "height": height,
            "fps": fps,
            "aspect_ratio": aspect_ratio,
            "duration": duration,
            "codec": metadata.get("codec"),
        },
    )
    components.append(meta_comp)
    counts["timeline_metadata"] += 1

    # 2. Video Clips
    raw_clips = timeline.get("clips") or []
    for c in raw_clips:
        c_id = c.get("id", f"clip_{c.get('index', 1):03d}")
        s_time = float(c.get("start_time", 0.0))
        e_time = float(c.get("end_time", 0.0))
        dur = float(c.get("duration", e_time - s_time))

        vis = c.get("visual_summary") or {}
        shot_type = vis.get("shot_type", "medium")
        desc = vis.get("description") or f"Shot {c.get('index', 1):02d} ({shot_type})"

        cam = c.get("camera_motion") or {}
        col = c.get("color_profile") or {}
        spd = c.get("speed_estimation") or {}

        is_rep = bool(c.get("is_repeated_footage"))
        subtype: ComponentSubtype = "repeated_footage" if is_rep else "cut_scene"

        vid_comp = ComponentItem(
            id=f"cmp_vid_{c_id}",
            category="video_clip",
            subtype=subtype,
            title=f"Shot {c.get('index', 1):02d} ({shot_type.replace('_', ' ').title()})",
            description=desc,
            start_time=s_time,
            end_time=e_time,
            duration=dur,
            track_id="track_v1",
            thumbnail_url=c.get("thumbnail_url"),
            preview_url=c.get("representative_frame_url"),
            status="original",
            is_replaceable=True,
            is_editable=True,
            is_inferred=False,  # Boundary is a detected fact
            confidence=float(c.get("boundary_confidence", 0.95)),
            evidence=f"Shot cut detected via {c.get('detector_source', 'TransNetV2+PySceneDetect')}",
            source_timestamp=s_time,
            original_asset_ref=metadata.get("filepath"),
            compatible_replacement_types=["video", "image"],
            intrinsic_properties={
                "clip_id": c_id,
                "index": c.get("index"),
                "start_frame": c.get("start_frame"),
                "end_frame": c.get("end_frame"),
                "shot_type": shot_type,
                "aspect_ratio": aspect_ratio,
                "resolution": f"{width}x{height}",
                "camera_motion": cam.get("primary_motion", "static"),
                "motion_magnitude": cam.get("motion_magnitude", 0.0),
                "color_look": col.get("estimated_look", "Standard"),
                "dominant_palette": col.get("dominant_palette_hex", []),
                "is_repeated": is_rep,
                "repeated_of": c.get("repeated_clip_id"),
            },
        )
        components.append(vid_comp)
        counts["video_clip"] += 1

        # 3. Transitions In
        trans_in = c.get("transition_in", "cut")
        trans_dur = float(c.get("transition_in_duration", 0.0))
        if trans_in != "none":
            trans_subtype: ComponentSubtype = (
                "cross_dissolve" if trans_in == "dissolve" else
                "fade_black" if trans_in == "fade_black" else
                "fade_white" if trans_in == "fade_white" else
                "directional_wipe" if trans_in == "wipe" else
                "hard_cut"
            )
            trn_comp = ComponentItem(
                id=f"cmp_trn_{c_id}",
                category="transition",
                subtype=trans_subtype,
                title=f"Transition: {trans_in.replace('_', ' ').title()}",
                description=f"{trans_in.replace('_', ' ').title()} leading into Shot {c.get('index', 1):02d}",
                start_time=max(0.0, s_time - trans_dur / 2.0),
                end_time=s_time + trans_dur / 2.0,
                duration=max(0.04, trans_dur),
                track_id="track_trn",
                status="original",
                is_replaceable=True,
                is_editable=True,
                is_inferred=True,
                confidence=0.88,
                evidence="Inter-frame luminance decay and pixel variance curve",
                source_timestamp=s_time,
                compatible_replacement_types=[],
                intrinsic_properties={"transition_type": trans_in, "duration": trans_dur},
            )
            components.append(trn_comp)
            counts["transition"] += 1

        # 4. Effects: Camera Motion
        prim_motion = cam.get("primary_motion", "static")
        if prim_motion != "static":
            efx_subtype: ComponentSubtype = (
                "camera_zoom" if "zoom" in prim_motion else
                "camera_tilt" if "tilt" in prim_motion else
                "camera_pan" if "pan" in prim_motion else
                "camera_shake" if "handheld" in prim_motion else
                "camera_pan"
            )
            efx_comp = ComponentItem(
                id=f"cmp_efx_cam_{c_id}",
                category="effect",
                subtype=efx_subtype,
                title=f"Camera Motion: {prim_motion.replace('_', ' ').title()}",
                description=f"Inferred {prim_motion.replace('_', ' ')} trajectory ({cam.get('motion_magnitude', 0.0):.1f} px/frame)",
                start_time=s_time,
                end_time=e_time,
                duration=dur,
                track_id="track_fx",
                status="original",
                is_replaceable=True,
                is_editable=True,
                is_inferred=True,
                confidence=float(cam.get("confidence", 0.85)),
                evidence=cam.get("evidence", "Farneback dense optical flow vector analysis"),
                source_timestamp=s_time,
                compatible_replacement_types=[],
                intrinsic_properties={
                    "motion_type": prim_motion,
                    "magnitude": cam.get("motion_magnitude", 0.0),
                    "pan_score": cam.get("pan_score", 0.0),
                    "tilt_score": cam.get("tilt_score", 0.0),
                    "zoom_score": cam.get("zoom_score", 0.0),
                },
            )
            components.append(efx_comp)
            counts["effect"] += 1

        # 5. Effects: Color Treatment
        col_look = col.get("estimated_look", "Standard Rec.709")
        col_comp = ComponentItem(
            id=f"cmp_efx_col_{c_id}",
            category="effect",
            subtype="color_treatment",
            title=f"Color Treatment: {col_look}",
            description=f"Dominant aesthetic palette: {', '.join(col.get('dominant_palette_hex', [])[:3])}",
            start_time=s_time,
            end_time=e_time,
            duration=dur,
            track_id="track_fx",
            status="original",
            is_replaceable=True,
            is_editable=True,
            is_inferred=True,
            confidence=float(col.get("confidence", 0.85)),
            evidence="K-means color clustering & RGB/HSV channel balance",
            source_timestamp=s_time,
            compatible_replacement_types=[],
            intrinsic_properties={
                "look": col_look,
                "palette": col.get("dominant_palette_hex", []),
                "temperature": col.get("temperature", "neutral"),
                "saturation": col.get("saturation_level", "natural"),
                "contrast": col.get("contrast_ratio", 1.0),
            },
        )
        components.append(col_comp)
        counts["effect"] += 1

        # 6. Effects: Speed Changes
        spd_val = float(spd.get("speed_factor", 1.0))
        if spd_val != 1.0:
            spd_comp = ComponentItem(
                id=f"cmp_efx_spd_{c_id}",
                category="effect",
                subtype="speed_change",
                title=f"Playback Speed: {spd_val:.2f}x ({spd.get('label', 'normal')})",
                description=spd.get("evidence", "Inter-frame motion flow consistency"),
                start_time=s_time,
                end_time=e_time,
                duration=dur,
                track_id="track_fx",
                status="original",
                is_replaceable=True,
                is_editable=True,
                is_inferred=True,
                confidence=float(spd.get("confidence", 0.75)),
                evidence=spd.get("evidence", "Motion variance"),
                source_timestamp=s_time,
                compatible_replacement_types=[],
                intrinsic_properties={"speed_factor": spd_val, "label": spd.get("label")},
            )
            components.append(spd_comp)
            counts["effect"] += 1

        # 7. Text Components & Graphics Overlays
        raw_texts = c.get("text_overlays") or []
        for t_idx, txt in enumerate(raw_texts):
            raw_cat = txt.get("category", "other")
            t_text = txt.get("text", "")
            t_time = float(txt.get("timestamp_sec", s_time))
            t_dur = min(3.0, max(1.0, e_time - t_time))
            bbox = txt.get("bbox_normalized", [0.1, 0.1, 0.2, 0.8])

            if raw_cat == "watermark":
                # Image / Graphic Overlay
                img_comp = ComponentItem(
                    id=f"cmp_img_{c_id}_{t_idx+1:02d}",
                    category="image_graphic",
                    subtype="watermark",
                    title=f"Watermark / Graphic: {t_text[:20]}",
                    description=f"Corner overlay or graphic watermark: '{t_text}'",
                    start_time=t_time,
                    end_time=t_time + t_dur,
                    duration=t_dur,
                    track_id="track_v2",
                    status="original",
                    is_replaceable=True,
                    is_editable=True,
                    is_inferred=False,
                    confidence=float(txt.get("confidence", 0.90)),
                    evidence="PP-OCR bounding box corner detection",
                    source_timestamp=t_time,
                    compatible_replacement_types=["image", "text"],
                    intrinsic_properties={
                        "original_text": t_text,
                        "bbox_normalized": bbox,
                        "category": raw_cat,
                    },
                )
                components.append(img_comp)
                counts["image_graphic"] += 1
            else:
                # Text Component
                txt_subtype: ComponentSubtype = (
                    "title_text" if raw_cat == "title" else
                    "subtitle_text" if raw_cat == "subtitle" else
                    "lower_third_text" if raw_cat == "lower_third" else
                    "credit_text" if raw_cat == "credit" else
                    "general_caption"
                )
                txt_comp = ComponentItem(
                    id=f"cmp_txt_{c_id}_{t_idx+1:02d}",
                    category="text_component",
                    subtype=txt_subtype,
                    title=f"[{raw_cat.replace('_', ' ').upper()}] {t_text[:24]}",
                    description=f"On-screen typography: '{t_text}'",
                    start_time=t_time,
                    end_time=t_time + t_dur,
                    duration=t_dur,
                    track_id="track_v2",
                    status="original",
                    is_replaceable=True,
                    is_editable=True,
                    is_inferred=False,
                    confidence=float(txt.get("confidence", 0.90)),
                    evidence="PP-OCR character recognition",
                    source_timestamp=t_time,
                    compatible_replacement_types=["text", "image"],
                    intrinsic_properties={
                        "original_text": t_text,
                        "bbox_normalized": bbox,
                        "category": raw_cat,
                    },
                )
                components.append(txt_comp)
                counts["text_component"] += 1

    # 8. Audio Components (Dialogue from Whisper & Background Mix from Librosa)
    transcript = timeline.get("transcript") or []
    for s_idx, sub in enumerate(transcript):
        sub_s = float(sub.get("start_sec", 0.0))
        sub_e = float(sub.get("end_sec", sub_s + 1.0))
        sub_text = sub.get("text", "")

        aud_comp = ComponentItem(
            id=f"cmp_aud_dia_{s_idx+1:03d}",
            category="audio_component",
            subtype="speech_dialogue",
            title=f"Dialogue: \"{sub_text[:26]}...\"",
            description=f"Spoken line: '{sub_text}'",
            start_time=sub_s,
            end_time=sub_e,
            duration=round(sub_e - sub_s, 3),
            track_id="track_a1",
            status="original",
            is_replaceable=True,
            is_editable=True,
            is_inferred=False,
            confidence=float(sub.get("confidence", 0.95)),
            evidence="Whisper neural speech transcription with VAD",
            source_timestamp=sub_s,
            compatible_replacement_types=["audio", "text"],
            intrinsic_properties={
                "full_text": sub_text,
                "words_count": len(sub.get("words", [])),
            },
        )
        components.append(aud_comp)
        counts["audio_component"] += 1

    # Background audio mix
    audio_analysis = timeline.get("audio_analysis") or {}
    has_audio = bool(audio_analysis.get("has_audio", False))
    if has_audio or duration > 0:
        tempo = float(audio_analysis.get("tempo_bpm", 120.0))
        beats = audio_analysis.get("beats") or []
        bg_comp = ComponentItem(
            id=f"cmp_aud_mix_{make_edit_project_id[:6]}",
            category="audio_component",
            subtype="background_music",
            title=f"Full Audio Mix ({tempo:.1f} BPM)",
            description=f"Synchronized background soundtrack with {len(beats)} tracked musical beats",
            start_time=0.0,
            end_time=duration,
            duration=duration,
            track_id="track_a2",
            status="original",
            is_replaceable=True,
            is_editable=True,
            is_inferred=False,
            confidence=0.92,
            evidence="Librosa spectral onset & beat grid analysis",
            source_timestamp=0.0,
            compatible_replacement_types=["audio"],
            intrinsic_properties={
                "tempo_bpm": tempo,
                "beat_count": len(beats),
                "rms_energy": audio_analysis.get("rms_energy_mean", 0.0),
            },
        )
        components.append(bg_comp)
        counts["audio_component"] += 1

    # Sort all components sequentially by start_time
    components.sort(key=lambda c: (c.start_time, c.category))

    return ComponentManifest(
        project_id=make_edit_project_id,
        source_reverse_ai_project_id=reverse_proj_id,
        fps=fps,
        width=width,
        height=height,
        aspect_ratio=aspect_ratio,
        total_duration_sec=duration,
        total_components_count=len(components),
        category_counts=counts,
        components=components,
    )
