# FAMONEMEDIA — System Architecture & Design Specification

## 1. System Vision
FAMONEMEDIA is an integrated creative platform combining:
1. **AI Reference Video Reverse-Engineering** (Dual shot detection, visual understanding, OCR text classification, speech transcription, tempo/beat tracking, camera motion estimation).
2. **Component-Level Replacement & Version Remixing** (7-category manifest extraction, asset matching, immutable version snapshots, automated composition).
3. **CapCut-Level Creative Browser Video Editor** (Multitrack timeline, keyframe animation, variable speed ramping, audio mixer, effects/filters, text typography).
4. **Desktop NLE Interoperability** (Shotcut MLT XML & portable media `.zip` bundle export, OpenTimelineIO interchange).

---

## 2. Core Architectural Pillars

```
                                      +------------------------------------+
                                      |   Next.js 14 Frontend Application  |
                                      | (Portal / Dashboard / Studio / NLE)|
                                      +-----------------+------------------+
                                                        |
                                                        | REST API / WebSockets
                                                        v
                                      +-----------------+------------------+
                                      |   FastAPI High-Performance Engine  |
                                      +--------+--------+---------+--------+
                                               |        |         |
                  +----------------------------+        |         +---------------------------+
                  |                                     |                                     |
                  v                                     v                                     v
     +--------------------------+          +--------------------------+          +--------------------------+
     |   Reverse AI Engine      |          |    Make Your Edit Engine |          |    Creative NLE Engine   |
     | [PROTECTED / IMMUTABLE]  |          | [PROTECTED / IMMUTABLE]  |          | (Multitrack / Rendering) |
     |--------------------------|          |--------------------------|          |--------------------------|
     | - TransNetV2 (ONNX)      |          | - Component Manifest     |          | - Multitrack V1/V2/A1    |
     | - PySceneDetect          |          | - Asset Matching (Rank)  |          | - Keyframe Curves        |
     | - RapidOCR / PP-OCRv6    |          | - Slot Overrides         |          | - Speed Ramping          |
     | - faster-whisper (int8)  |          | - Version History (v001) |          | - FFmpeg CPU Render      |
     | - Librosa Beat Sync      |          | - FFmpeg Composition     |          | - Shotcut MLT Bundler    |
     | - OpenCV Optical Flow    |          +--------------------------+          +--------------------------+
     +--------------------------+                       |                                     |
                  |                                     |                                     |
                  +------------------> Adapter Layer <--+-------------------------------------+
                                               |
                                               v
                                  +----------------------------+
                                  | Persistence & Media Layer  |
                                  | - SQLite / PostgreSQL      |
                                  | - Storage / Outputs        |
                                  | - Models / Local Weights   |
                                  +----------------------------+
```

---

## 3. Data Flow & Interoperability
1. **Reference Deconstruction**:
   User uploads reference video &rarr; `ingestion` probes container &rarr; `detection` identifies shot cuts &rarr; `ocr` detects on-screen text &rarr; `audio` transcribes speech and detects beat pulses &rarr; `reconstruction` synthesizes multitrack timeline &rarr; saved to `outputs/{project_id}/project.json`.
2. **Component Remixing**:
   `backend/make_edit/manifest.py` compiles the completed analysis into a 7-category manifest &rarr; user replaces slots &rarr; `backend/make_edit/renderer.py` composes new video &rarr; snapshots saved to `outputs/make_edit/{project_id}/`.
3. **Creative Studio Editing**:
   User opens project in Creative Studio &rarr; imports shots, custom assets, and text presets &rarr; edits with trimming, keyframes, transforms, and audio volume &rarr; renders directly to MP4 via local CPU FFmpeg OR exports to Shotcut Desktop via native MLT XML and portable `.zip` bundle.

---

## 4. Hardware Optimization & Non-Interference
- **CPU-Only Execution**: Clamped worker thread pool (`MAX_CPU_THREADS = 8`), memory-friendly batch sizes, and 16-bit / 8-bit quantized ONNX inference.
- **Strict Module Isolation**: `backend/reverse_ai/` and `backend/make_edit/` are strictly immutable; Creative Studio communicates only via read-only outputs and external adapters.
- **Zero Paid APIs**: All inference models (TransNetV2, RapidOCR, Whisper, Librosa, OpenCV) execute 100% locally on the host machine.
