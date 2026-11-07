"""
FAMONEMEDIA Reverse AI - End-to-End Backend Test Suite
Tests API endpoints, pipeline execution, timeline reconstruction, and exports.
"""

import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_system_endpoints():
    res_hw = client.get("/api/system/hardware")
    assert res_hw.status_code == 200
    hw = res_hw.json()
    assert "cpu_count_logical" in hw
    assert "ram_available_gb" in hw

    res_models = client.get("/api/system/models")
    assert res_models.status_code == 200
    models = res_models.json()
    assert "transnetv2" in models
    assert "pyscenedetect" in models
    assert "whisper" in models
    assert "pp_ocr" in models


def test_project_lifecycle_and_analysis():
    # 1. Create project
    create_res = client.post("/api/projects", json={"name": "Test Integration Project"})
    assert create_res.status_code == 201
    project = create_res.json()
    project_id = project["id"]
    assert project["name"] == "Test Integration Project"

    # 2. Upload sample video
    sample_video = Path("storage/sample_reference.mp4")
    assert sample_video.exists(), "Sample video storage/sample_reference.mp4 must exist"

    with open(sample_video, "rb") as f:
        upload_res = client.post(
            f"/api/projects/{project_id}/upload",
            files={"file": ("sample_reference.mp4", f, "video/mp4")},
        )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["project"]["status"] == "uploaded"
    assert upload_data["metadata"]["fps"] == 24.0

    # 3. Trigger analysis
    analyze_res = client.post(f"/api/projects/{project_id}/analyze")
    assert analyze_res.status_code == 200
    job_id = analyze_res.json()["job_id"]

    # 4. Poll until job completes (or max 60s)
    max_wait = 60
    start_time = time.time()
    final_status = None
    while time.time() - start_time < max_wait:
        poll_res = client.get(f"/api/jobs/{job_id}")
        assert poll_res.status_code == 200
        job = poll_res.json()
        if job["status"] in ["completed", "failed", "cancelled"]:
            final_status = job
            break
        time.sleep(1)

    assert final_status is not None, "Job timed out"
    assert final_status["status"] == "completed", f"Job failed: {final_status.get('error_message')}"
    assert final_status["progress"] == 100

    # 5. Retrieve timeline
    timeline_res = client.get(f"/api/projects/{project_id}/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert len(timeline["clips"]) >= 4
    assert len(timeline["tracks"]) == 4  # Video, Text, Audio, Effects
    assert timeline["audio_analysis"]["has_audio"] is True

    # 6. Test timeline PATCH (manual correction)
    first_clip_id = timeline["clips"][0]["id"]
    patch_res = client.patch(
        f"/api/projects/{project_id}/timeline",
        json={"clips": [{"id": first_clip_id, "shot_type": "close_up", "primary_motion": "pan_left"}]},
    )
    assert patch_res.status_code == 200
    patched_timeline = patch_res.json()
    first_clip_patched = next(c for c in patched_timeline["clips"] if c["id"] == first_clip_id)
    assert first_clip_patched["visual_summary"]["shot_type"] == "close_up"
    assert first_clip_patched["user_modified"] is True

    # 7. Test Exports
    for fmt in ["otio", "edl", "json", "srt", "csv"]:
        exp_res = client.get(f"/api/projects/{project_id}/export?format={fmt}")
        assert exp_res.status_code == 200, f"Export {fmt} failed with {exp_res.status_code}"
        assert len(exp_res.content) > 20, f"Export {fmt} returned empty file"

    print("All backend integration tests passed successfully!")


if __name__ == "__main__":
    test_system_endpoints()
    test_project_lifecycle_and_analysis()
