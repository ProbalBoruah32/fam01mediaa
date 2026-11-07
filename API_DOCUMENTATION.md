# FAMONEMEDIA — REST API Documentation

Base URL: `http://127.0.0.1:8000`

---

## 1. System & Hardware Endpoints

### `GET /api/health`
Returns system health status and local engine confirmation.
* **Response (200 OK)**:
```json
{ "status": "healthy", "engine": "local_cpu" }
```

### `GET /api/system/hardware`
Returns CPU cores, RAM statistics, disk free space, and device capabilities.

---

## 2. Reverse AI Core Endpoints (Protected)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List all reverse-engineering projects |
| `POST` | `/api/projects` | Create a new reverse-engineering project |
| `GET` | `/api/projects/{id}` | Retrieve project details, video metadata, and status |
| `POST` | `/api/projects/{id}/upload` | Upload MP4/MOV/MKV reference video |
| `POST` | `/api/projects/{id}/analyze` | Dispatch background analysis job |
| `GET` | `/api/jobs/{job_id}` | Poll analysis progress (0–100%) and current pipeline step |
| `GET` | `/api/projects/{id}/timeline` | Retrieve synthesized multitrack timeline |
| `PATCH` | `/api/projects/{id}/timeline` | Apply manual trim or property adjustments to clips |
| `GET` | `/api/projects/{id}/export?format={fmt}` | Export timeline to `otio`, `edl`, `json`, `srt`, `csv` |

---

## 3. Make Your Edit Endpoints (Protected)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/make-edit/projects` | Generate 7-category manifest from Reverse AI project |
| `GET` | `/api/make-edit/projects/{id}/manifest` | Retrieve current component manifest |
| `POST` | `/api/make-edit/projects/{id}/assets` | Upload user replacement asset (video, image, audio) |
| `POST` | `/api/make-edit/projects/{id}/match-assets` | Run heuristic matching to rank target replacement slots |
| `POST` | `/api/make-edit/projects/{id}/replace` | Assign replacement asset to component slot |
| `POST` | `/api/make-edit/projects/{id}/reset/{comp_id}` | Reset component back to original reference |
| `POST` | `/api/make-edit/projects/{id}/versions` | Create immutable version snapshot (`v001`, `v002`...) |
| `POST` | `/api/make-edit/projects/{id}/versions/{v}/restore` | Restore previous version snapshot |
| `POST` | `/api/make-edit/projects/{id}/render` | Trigger FFmpeg CPU composition to MP4 |

---

## 4. Creative Studio & Editor Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/editor/projects` | Create a new creative editor project (name, aspect ratio) |
| `GET` | `/api/editor/projects` | List all creative editor projects |
| `GET` | `/api/editor/projects/{id}` | Load project timeline, tracks, clips, and transforms |
| `PUT` | `/api/editor/projects/{id}` | Update timeline state (clips, trims, keyframes, text) |
| `DELETE` | `/api/editor/projects/{id}` | Delete project and associated renders |
| `POST` | `/api/editor/upload` | Upload media asset to editor project library |
| `GET` | `/api/editor/media/{proj_id}/{file}` | Stream media asset for browser playback |
| `POST` | `/api/editor/projects/{id}/import-reverse/{rev_id}` | Import detected shots and OCR text from Reverse AI |
| `POST` | `/api/editor/projects/{id}/export-shotcut` | Build Shotcut MLT XML and portable `.zip` bundle |
| `GET` | `/api/editor/projects/{id}/download-shotcut-zip` | Download Shotcut portable `.zip` package |
| `GET` | `/api/editor/projects/{id}/download-shotcut-mlt` | Download standalone Shotcut `.mlt` XML file |
| `POST` | `/api/editor/projects/{id}/render` | Start local CPU FFmpeg timeline render to MP4 |
| `GET` | `/api/editor/jobs/{job_id}` | Poll render progress (0–100%) and status |
| `GET` | `/api/editor/renders/{proj_id}/{file}` | Download or preview rendered MP4 video |
