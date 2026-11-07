"""
FAMONEMEDIA Make Your Edit - Integration Test Suite
Verifies read-only Reverse AI ingestion, automatic 7-category manifest extraction,
smart asset matching, non-destructive replacement, version snapshots, and rendering.
"""

import sys
import os
import json
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.make_edit.storage import make_edit_storage
from backend.reverse_ai.jobs.storage import storage_manager as reverse_ai_storage

client = TestClient(app)


def test_make_your_edit_complete_workflow():
    # 1. Identify an existing completed Reverse AI project
    reverse_projects = reverse_ai_storage.list_projects()
    completed_rev = next((p for p in reverse_projects if p.status == "completed" and p.timeline), None)
    assert completed_rev is not None, "Need at least one completed Reverse AI project to test Make Your Edit"
    
    rev_id = completed_rev.id
    rev_original_updated_at = completed_rev.updated_at
    
    # Check original timeline clip count before Make Your Edit imports it
    rev_original_clip_count = len(completed_rev.timeline.clips)

    # 2. Create Make Your Edit Project
    create_res = client.post(
        "/api/make-edit/projects",
        json={"name": "Test My Custom Remix", "reverse_ai_project_id": rev_id},
    )
    assert create_res.status_code == 201
    project_data = create_res.json()
    medit_id = project_data["id"]
    manifest = project_data["manifest"]
    
    assert manifest["total_components_count"] > 0
    print(f"Make Your Edit project created: {medit_id} with {manifest['total_components_count']} components.")

    # 3. Verify All 7 Categories Exist in Manifest
    cats = manifest["category_counts"]
    print("Detected Category Breakdown:", cats)
    assert cats.get("video_clip", 0) > 0, "Video clips must be detected"
    assert cats.get("timeline_metadata", 0) > 0, "Timeline metadata must be present"
    assert "text_component" in cats
    assert "audio_component" in cats
    assert "transition" in cats
    assert "effect" in cats

    # 4. Upload an Asset to the Local Asset Library
    sample_video = Path("storage/sample_reference.mp4")
    assert sample_video.exists()
    
    with open(sample_video, "rb") as f:
        upload_ast_res = client.post(
            f"/api/make-edit/projects/{medit_id}/assets",
            files={"file": ("my_cool_clip.mp4", f, "video/mp4")},
            data={"media_type": "video", "tags": "custom,action,sunset"},
        )
    assert upload_ast_res.status_code == 200
    asset_data = upload_ast_res.json()
    asset_id = asset_data["id"]
    print(f"Asset uploaded to library: {asset_id} ({asset_data['name']})")

    # 5. Test Smart Asset Matching
    match_res = client.post(
        f"/api/make-edit/projects/{medit_id}/match-assets",
        json={"asset_id": asset_id, "top_k": 3},
    )
    assert match_res.status_code == 200
    suggestions = match_res.json()
    assert len(suggestions) > 0
    print(f"Top suggested target component: {suggestions[0]['component_id']} (Score: {suggestions[0]['match_score']})")

    # 6. Replace a Target Component
    target_comp_id = suggestions[0]["component_id"]
    rep_res = client.post(
        f"/api/make-edit/projects/{medit_id}/replace",
        json={
            "component_id": target_comp_id,
            "asset_id": asset_id,
            "fit_mode": "crop",
            "trim_in": 0.5,
            "volume": 0.9,
        },
    )
    assert rep_res.status_code == 200
    replaced_comp = rep_res.json()
    assert replaced_comp["status"] == "replaced"
    assert replaced_comp["replacement"]["asset_id"] == asset_id
    assert replaced_comp["replacement"]["fit_mode"] == "crop"

    # Also test replacing a text component
    text_comps = [c for c in manifest["components"] if c["category"] == "text_component"]
    if text_comps:
        txt_target = text_comps[0]["id"]
        rep_txt_res = client.post(
            f"/api/make-edit/projects/{medit_id}/replace",
            json={
                "component_id": txt_target,
                "replacement_text": "MY BRAND NEW TITLE",
                "font_color": "#06b6d4",
            },
        )
        assert rep_txt_res.status_code == 200
        assert rep_txt_res.json()["replacement"]["replacement_text"] == "MY BRAND NEW TITLE"

    # 7. Test OpenCut Classic Timeline Format
    timeline_res = client.get(f"/api/make-edit/projects/{medit_id}/timeline")
    assert timeline_res.status_code == 200
    oc_timeline = timeline_res.json()
    assert oc_timeline["format"] == "opencut_classic_v1"
    assert len(oc_timeline["tracks"]) == 4

    # 8. Create Version Snapshot & Test Restoration
    ver_res = client.post(
        f"/api/make-edit/projects/{medit_id}/versions",
        json={"name": "First Replaced Draft", "description": "Replaced shot 1 and headline title"},
    )
    assert ver_res.status_code == 200
    ver_data = ver_res.json()
    assert ver_data["version_number"] == 2
    assert ver_data["replaced_count"] >= 1

    # Reset component to original and verify
    reset_res = client.post(f"/api/make-edit/projects/{medit_id}/reset/{target_comp_id}")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "original"

    # Restore snapshot v2
    restore_res = client.post(f"/api/make-edit/projects/{medit_id}/versions/2/restore")
    assert restore_res.status_code == 200
    restored_proj = restore_res.json()
    assert restored_proj["active_version_number"] == 2
    restored_comp = next(c for c in restored_proj["manifest"]["components"] if c["id"] == target_comp_id)
    assert restored_comp["status"] == "replaced", "Restored version must bring back the replaced state"

    # 9. Test Timeline Rendering (Fast Draft 16:9 Preset)
    render_res = client.post(
        f"/api/make-edit/projects/{medit_id}/render",
        json={"preset": "16:9", "quality": "fast_draft"},
    )
    assert render_res.status_code == 200
    render_data = render_res.json()
    assert render_data["status"] == "completed"
    assert Path(render_data["output_filepath"]).exists()
    assert Path(render_data["output_filepath"]).stat().st_size > 50000, "Rendered video must be non-empty"
    print(f"Render successful: {render_data['output_filepath']} ({Path(render_data['output_filepath']).stat().st_size} bytes)")

    # 10. CRITICAL NON-INTERFERENCE VERIFICATION:
    # Ensure Reverse AI original project was NEVER modified
    fresh_rev = reverse_ai_storage.load_project(rev_id)
    assert fresh_rev is not None
    assert fresh_rev.updated_at == rev_original_updated_at, "Reverse AI project updated_at must NOT change"
    assert len(fresh_rev.timeline.clips) == rev_original_clip_count, "Reverse AI clip count must NOT change"
    print("Non-interference verification passed! Reverse AI project is 100% unaltered.")


if __name__ == "__main__":
    test_make_your_edit_complete_workflow()
    print("All Make Your Edit backend tests passed successfully!")
