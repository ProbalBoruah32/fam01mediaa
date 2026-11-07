"""
FAMONEMEDIA Relational Database & Central Asset Library Tests
Tests database table initialization, legacy project scanning, media metadata extraction,
and waveform generation.
"""

import sys
import unittest
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database.db import init_db, SessionLocal
from backend.database.models import DBProject, DBAsset
from backend.database.importer import sync_existing_projects
from backend.editor.asset_manager import ingest_media_file, extract_media_metadata


class TestDatabaseAndAssets(unittest.TestCase):
    def setUp(self):
        init_db()
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_init_and_sync_legacy_projects(self):
        sync_existing_projects(self.db)
        projects = self.db.query(DBProject).all()
        self.assertGreater(len(projects), 0)
        print(f"Database successfully synchronized {len(projects)} existing projects from disk.")
        for p in projects[:3]:
            print(f" - [{p.project_type.upper()}] {p.name} ({p.duration_sec:.1f}s, {p.total_clips} clips)")

    def test_02_ingest_sample_media(self):
        # Ingest existing sample_reference.mp4 from storage
        sample_video = Path("storage/sample_reference.mp4")
        if sample_video.exists():
            asset = ingest_media_file(sample_video, "sample_reference.mp4")
            self.assertIsNotNone(asset)
            self.assertEqual(asset.media_type, "video")
            self.assertGreater(asset.duration_sec, 0)
            self.assertIsNotNone(asset.waveform_json)
            print(f"Asset ingested: {asset.name} ({asset.duration_sec:.1f}s, {asset.width}x{asset.height})")
            print(f"Waveform points generated: {len(asset.waveform_json)} bytes of peak data")


if __name__ == "__main__":
    unittest.main()
