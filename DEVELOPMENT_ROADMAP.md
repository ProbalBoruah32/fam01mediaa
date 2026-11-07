# FAMONEMEDIA — Development Roadmap

## Phase 0: Repository Audit & Baseline Protection [COMPLETED]
- [x] Complete written inventory of protected modules, APIs, and models.
- [x] Document existing functionality, hardware limits, and GPL license isolation.
- [x] Establish regression tests ensuring zero modification to protected code.
- [x] Publish `FAMONEMEDIA_FEATURE_TRACKER.md`, `ARCHITECTURE.md`, `API_DOCUMENTATION.md`, `EDITOR_SCHEMA.md`.

## Phase 1: Platform Foundation & Shared Schema [CURRENT]
- [x] Canonical `FAMONEMEDIA_EDITOR_SCHEMA_V1` specification.
- [ ] Central Asset Manager (FFprobe metadata, thumbnails, waveform extraction).
- [ ] Additive Relational Database Layer (SQLAlchemy + SQLite default / PostgreSQL ready).
- [ ] Legacy Project Scanner (auto-import existing `outputs/` project JSONs into the database).
- [ ] Unified Creative Dashboard UI (recent projects, asset manager, storage telemetry).

## Phase 2: CapCut-Level Creative Studio Core
- [ ] Ripple editing & ripple delete.
- [ ] Multi-clip selection, grouping, clip duplication, copy/paste.
- [ ] Frame-accurate scrub with sub-frame timecode display.
- [ ] Magnetic timeline snapping & user timeline markers.
- [ ] Undo / Redo history state machine.

## Phase 3: Keyframe Animation & Speed Ramping
- [ ] Real-time keyframe interpolation (Linear, Ease-in, Ease-out, Ease-in-out, Bézier).
- [ ] Animatable parameters: Scale, Position X/Y, Rotation, Opacity, Volume.
- [ ] Variable speed curves and freeze-frame insertion.
- [ ] Typography Studio (font upload, animated presets, karaoke highlighting).

## Phase 4: Video Effects, Transitions & Audio Studio
- [ ] Modular video effects architecture (Gaussian blur, glitch, RGB split, film grain, vignette, sharpen).
- [ ] Video transitions engine (crossfade, dissolve, wipe, slide, zoom).
- [ ] Color grading panel (Lift/Gamma/Gain color wheels, HSL, temperature/tint, contrast/saturation).
- [ ] Masking & blend modes (rectangle/circle masks, multiply, screen, overlay, chroma key).
- [ ] Audio Studio (waveform canvas, EQ, compression, audio ducking).

## Phase 5: Reverse Studio Deep Integration
- [ ] 1-Click transfer from Reverse Studio deconstructed timeline into Creative Studio tracks.
- [ ] 1-Click transfer from Make Your Edit remixed compositions into Creative Studio tracks.

## Phase 6: AI Studio (Local & Optional Cloud)
- [ ] Local CPU AI tools (automatic speech-to-text captions, scene understanding).
- [ ] Optional `fal.ai` backend adapter with secure server-only API keys and cost estimates.

## Phase 7: High-Performance FFmpeg Rendering Engine
- [ ] Background render queue with progress polling and cancellation.
- [ ] Multi-format support (MP4, MOV, WebM, GIF, custom resolution/framerate/bitrate).

## Phase 8: Interoperability Adapters
- [ ] OpenCut format converter.
- [ ] Shotcut MLT XML & portable `.zip` media package export.
- [ ] OpenTimelineIO (`.otio`) timeline interchange.

## Phase 9: Production Deployment & Docker
- [ ] Multi-stage Dockerfile and Docker Compose.
- [ ] Nginx reverse proxy configuration.
- [ ] Public deployment verification.
