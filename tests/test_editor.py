"""
FAMONEMEDIA CapCut + Shotcut Combined Editor Engine - Automated Tests
Tests project creation, timeline manipulation, Shotcut MLT XML export, and FFmpeg rendering.
"""

import sys
import unittest
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.editor.models import (
    EditorProject,
    EditorTrack,
    EditorClip,
    TextProperties,
    ClipTransform,
)
from backend.editor.storage import editor_storage
from backend.editor.mlt_exporter import generate_shotcut_mlt_xml, build_shotcut_export_package
from backend.editor.renderer import render_editor_timeline


class TestEditorEngine(unittest.TestCase):
    def setUp(self):
        self.project = EditorProject(
            id="test_creative_proj_01",
            name="Urban Flow Promo",
            aspect_ratio="16:9",
            width=1920,
            height=1080,
            fps=30.0,
            total_duration_sec=6.0,
            tracks=[
                EditorTrack(
                    id="track_v1",
                    name="Main Video (V1)",
                    type="video",
                    order=0,
                    clips=[
                        EditorClip(
                            id="clip_01",
                            track_id="track_v1",
                            name="Intro Shot",
                            media_type="text",
                            start_time=0.0,
                            duration=3.0,
                            text_properties=TextProperties(
                                text="FAMONEMEDIA CREATIVE",
                                font_family="Arial",
                                font_size=56,
                                font_color="#00f2fe",
                            ),
                        ),
                        EditorClip(
                            id="clip_02",
                            track_id="track_v1",
                            name="Outro Shot",
                            media_type="text",
                            start_time=3.0,
                            duration=3.0,
                            text_properties=TextProperties(
                                text="SHOTCUT + CAPCUT POWER",
                                font_family="Arial",
                                font_size=48,
                                font_color="#ff007f",
                            ),
                        ),
                    ],
                ),
                EditorTrack(
                    id="track_v2",
                    name="Overlays & Text (V2)",
                    type="overlay",
                    order=1,
                    clips=[],
                ),
            ],
        )

    def test_01_save_and_load_project(self):
        editor_storage.save_project(self.project)
        loaded = editor_storage.load_project(self.project.id)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.name, "Urban Flow Promo")
        self.assertEqual(len(loaded.tracks[0].clips), 2)

    def test_02_shotcut_mlt_generation(self):
        xml_str, media_map = generate_shotcut_mlt_xml(self.project)
        self.assertIn("<mlt", xml_str)
        self.assertIn("version=\"7.24.0\"", xml_str)
        self.assertIn("width=\"1920\"", xml_str)
        self.assertIn("height=\"1080\"", xml_str)
        self.assertIn("FAMONEMEDIA CREATIVE", xml_str)
        self.assertIn("<tractor", xml_str)
        self.assertIn("<multitrack>", xml_str)
        print("MLT XML generated successfully with valid Shotcut tags.")

    def test_03_shotcut_export_package(self):
        pkg = build_shotcut_export_package(self.project)
        self.assertEqual(pkg.project_id, self.project.id)
        self.assertTrue(pkg.mlt_filename.endswith(".mlt"))
        self.assertTrue(pkg.zip_filename.endswith(".zip"))
        
        pdir = editor_storage.get_project_dir(self.project.id)
        zip_path = pdir / pkg.zip_filename
        self.assertTrue(zip_path.exists())
        self.assertGreater(zip_path.stat().st_size, 0)
        print(f"Shotcut ZIP bundle created: {zip_path.name} ({zip_path.stat().st_size} bytes)")

    def test_04_render_timeline(self):
        pdir = editor_storage.get_project_dir(self.project.id)
        out_render = pdir / "renders" / "test_render.mp4"
        
        rendered_file = render_editor_timeline(
            project=self.project,
            output_filepath=out_render,
            crf=26,
        )
        self.assertTrue(Path(rendered_file).exists())
        size = Path(rendered_file).stat().st_size
        self.assertGreater(size, 1000)
        print(f"Timeline rendered to MP4 successfully: {rendered_file} ({size} bytes)")


if __name__ == "__main__":
    unittest.main()
