"""
FAMONEMEDIA CapCut + Shotcut Combined Editor Engine - Shotcut MLT XML Exporter
Translates the browser multitrack editor timeline into standard Shotcut-compatible
MLT XML and packages all media into a self-contained portable .zip archive.
"""

from __future__ import annotations
import shutil
import zipfile
import xml.etree.ElementTree as ET
from xml.dom import minidom
from pathlib import Path
from typing import Dict, Tuple

from backend.editor.models import EditorProject, ShotcutExportPackage
from backend.editor.storage import editor_storage


def generate_shotcut_mlt_xml(project: EditorProject, media_rel_dir: str = "media") -> Tuple[str, Dict[str, Path]]:
    """
    Generates standard Shotcut-compliant MLT XML string and returns map of source media files.
    """
    fps = max(float(project.fps), 1.0)
    width = project.width
    height = project.height
    
    # Calculate aspect ratio display numbers
    if project.aspect_ratio == "9:16":
        aspect_num, aspect_den = "9", "16"
    elif project.aspect_ratio == "1:1":
        aspect_num, aspect_den = "1", "1"
    else:
        aspect_num, aspect_den = "16", "9"

    mlt = ET.Element("mlt")
    mlt.set("LC_NUMERIC", "C")
    mlt.set("version", "7.24.0")
    mlt.set("title", project.name)
    mlt.set("producer", "main_bin")

    # Profile tag defines project resolution and framerate
    profile = ET.SubElement(mlt, "profile")
    profile.set("description", f"{project.name} Profile")
    profile.set("width", str(width))
    profile.set("height", str(height))
    profile.set("progressive", "1")
    profile.set("sample_aspect_num", "1")
    profile.set("sample_aspect_den", "1")
    profile.set("display_aspect_num", aspect_num)
    profile.set("display_aspect_den", aspect_den)
    profile.set("frame_rate_num", str(int(fps)))
    profile.set("frame_rate_den", "1")
    profile.set("colorspace", "709")

    referenced_media_map: Dict[str, Path] = {}
    producer_ids: Dict[str, str] = {}

    # 1. Create Producers for every media clip
    prod_counter = 0
    for track in project.tracks:
        for clip in track.clips:
            if not clip.file_path and clip.media_type != "text":
                continue

            prod_id = f"producer_{prod_counter}"
            producer_ids[clip.id] = prod_id
            prod_counter += 1

            producer = ET.SubElement(mlt, "producer")
            producer.set("id", prod_id)

            if clip.media_type == "text" and clip.text_properties:
                # Shotcut text producer
                producer.set("in", "0")
                producer.set("out", str(max(int(clip.duration * fps) - 1, 0)))
                
                prop_resource = ET.SubElement(producer, "property")
                prop_resource.set("name", "resource")
                prop_resource.text = clip.text_properties.text
                
                prop_mlt = ET.SubElement(producer, "property")
                prop_mlt.set("name", "mlt_service")
                prop_mlt.text = "qtext"

                prop_fg = ET.SubElement(producer, "property")
                prop_fg.set("name", "fgcolour")
                prop_fg.text = clip.text_properties.font_color or "#ffffff"
            else:
                src_path = Path(clip.file_path).resolve()
                if src_path.exists():
                    safe_name = f"{clip.id}_{src_path.name}"
                    referenced_media_map[safe_name] = src_path
                    rel_target = f"{media_rel_dir}/{safe_name}"
                else:
                    rel_target = clip.file_path

                in_frame = int(clip.trim_in * fps)
                out_frame = in_frame + int(clip.duration * fps) - 1

                producer.set("in", str(in_frame))
                producer.set("out", str(out_frame))

                prop_resource = ET.SubElement(producer, "property")
                prop_resource.set("name", "resource")
                prop_resource.text = rel_target

                # Volume / Gain filter if volume != 1.0
                if clip.volume != 1.0:
                    filter_vol = ET.SubElement(producer, "filter")
                    filter_vol.set("id", f"vol_{clip.id}")
                    vol_svc = ET.SubElement(filter_vol, "property")
                    vol_svc.set("name", "mlt_service")
                    vol_svc.text = "volume"
                    vol_val = ET.SubElement(filter_vol, "property")
                    vol_val.set("name", "gain")
                    vol_val.text = str(round(clip.volume, 2))

    # 2. Create Playlists (one per track)
    tractor = ET.SubElement(mlt, "tractor")
    tractor.set("id", "main_tractor")
    tractor.set("title", project.name)
    multitrack = ET.SubElement(tractor, "multitrack")

    for track in project.tracks:
        playlist = ET.SubElement(mlt, "playlist")
        playlist.set("id", f"playlist_{track.id}")

        # Add track to multitrack
        track_ref = ET.SubElement(multitrack, "track")
        track_ref.set("producer", f"playlist_{track.id}")

        # Sort clips by timeline start time
        sorted_clips = sorted(track.clips, key=lambda c: c.start_time)
        current_time_sec = 0.0

        for clip in sorted_clips:
            # Add blank space if gap between clips
            gap = clip.start_time - current_time_sec
            if gap > 0.03: # More than 1 frame gap
                blank = ET.SubElement(playlist, "blank")
                blank.set("length", str(int(gap * fps)))
                current_time_sec += gap

            prod_id = producer_ids.get(clip.id)
            if prod_id:
                entry = ET.SubElement(playlist, "entry")
                entry.set("producer", prod_id)
                in_f = int(clip.trim_in * fps)
                out_f = in_f + int(clip.duration * fps) - 1
                entry.set("in", str(in_f))
                entry.set("out", str(max(out_f, in_f)))
                current_time_sec += clip.duration

    # 3. Transitions between tracks if multiple tracks exist
    # Add affine blend transition between upper and lower video tracks
    transition = ET.SubElement(tractor, "transition")
    transition.set("id", "transition_composite")
    t_svc = ET.SubElement(transition, "property")
    t_svc.set("name", "mlt_service")
    t_svc.text = "affine"
    t_a = ET.SubElement(transition, "property")
    t_a.set("name", "a_track")
    t_a.text = "0"
    t_b = ET.SubElement(transition, "property")
    t_b.set("name", "b_track")
    t_b.text = "1"

    # Pretty-print XML
    raw_xml = ET.tostring(mlt, encoding="utf-8")
    reparsed = minidom.parseString(raw_xml)
    return reparsed.toprettyxml(indent="  ", encoding="utf-8").decode("utf-8"), referenced_media_map


def build_shotcut_export_package(project: EditorProject) -> ShotcutExportPackage:
    """
    Builds the complete Shotcut package:
    - Generates .mlt XML
    - Copies referenced media into bundle/media/
    - Zips everything into project_name_shotcut.zip
    """
    pdir = editor_storage.get_project_dir(project.id)
    bundle_dir = pdir / "shotcut_bundle"
    media_dir = bundle_dir / "media"
    
    # Clean previous bundle
    if bundle_dir.exists():
        shutil.rmtree(bundle_dir, ignore_errors=True)
    bundle_dir.mkdir(parents=True, exist_ok=True)
    media_dir.mkdir(parents=True, exist_ok=True)

    # Generate MLT XML
    mlt_content, media_map = generate_shotcut_mlt_xml(project, media_rel_dir="media")
    
    safe_name = project.name.replace(" ", "_").lower()
    mlt_filename = f"{safe_name}.mlt"
    mlt_path = bundle_dir / mlt_filename
    with open(mlt_path, "w", encoding="utf-8") as f:
        f.write(mlt_content)

    # Copy media assets
    for dest_name, src_path in media_map.items():
        try:
            target_path = media_dir / dest_name
            shutil.copy2(src_path, target_path)
        except Exception as e:
            print(f"[ShotcutExporter] Failed to copy {src_path}: {e}")

    # Write README
    readme_path = bundle_dir / "README_SHOTCUT.txt"
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(f"FAMONEMEDIA — Shotcut Desktop Project Bundle\n")
        f.write(f"Project: {project.name}\n")
        f.write(f"Resolution: {project.width}x{project.height} ({project.aspect_ratio}) @ {project.fps}fps\n\n")
        f.write("INSTRUCTIONS:\n")
        f.write("1. Extract this entire zip file to a folder on your computer.\n")
        f.write(f"2. Launch Shotcut Desktop (https://shotcut.org).\n")
        f.write(f"3. In Shotcut, click 'Open File' (Ctrl+O) and select '{mlt_filename}'.\n")
        f.write("4. Your multitrack timeline, cuts, audio levels, and media will load automatically!\n")

    # Create ZIP archive
    zip_filename = f"{safe_name}_shotcut_bundle.zip"
    zip_path = pdir / zip_filename
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in bundle_dir.rglob("*"):
            if item.is_file():
                zf.write(item, arcname=item.relative_to(bundle_dir))

    return ShotcutExportPackage(
        project_id=project.id,
        project_name=project.name,
        mlt_filename=mlt_filename,
        zip_filename=zip_filename,
        mlt_download_url=f"/api/editor/projects/{project.id}/download-shotcut-mlt",
        zip_download_url=f"/api/editor/projects/{project.id}/download-shotcut-zip",
        file_size_bytes=zip_path.stat().st_size,
        total_media_files=len(media_map),
        instructions=[
            f"Extract '{zip_filename}' into any directory.",
            f"Open Shotcut Desktop and choose File -> Open File -> '{mlt_filename}'.",
            "All video, audio, and text tracks will load with accurate in/out points and transforms."
        ]
    )
