# FAMONEMEDIA Reverse AI

FAMONEMEDIA Reverse AI is a local video-analysis and editing application. It combines a FastAPI backend with a Next.js interface to inspect video, build editable project timelines, and export editing data. Analysis runs on the local machine; optional model weights are downloaded separately.

> **Privacy:** Uploaded media, project databases, generated previews, and exports are local working data. They are intentionally excluded from Git. Do not remove these exclusions or publish user media, credentials, or downloaded model weights without reviewing their rights and contents first.

## Features

- Local video upload and project management
- Video and scene analysis with CPU-oriented processing and heuristic fallbacks
- Editing workspaces for timeline and asset workflows
- Timeline and project exports, including OpenTimelineIO, EDL, JSON, SRT, and CSV where supported
- FastAPI endpoints and a browser-based Next.js frontend

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [EDITOR_SCHEMA.md](./EDITOR_SCHEMA.md), and [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for more detail.

## Requirements

- Windows 10/11 (the included setup and launcher scripts target Windows)
- Python 3.11 recommended
- Node.js 18.17 or newer and npm
- FFmpeg and FFprobe available on `PATH` for media processing
- Available disk space for dependencies, optional models, and your own media

The application is designed to work without a GPU. Processing speed and the availability of model-backed features depend on your hardware and installed models.

## Quick start (Windows PowerShell)

From the project directory:

```powershell
# Install/check prerequisites, install dependencies, build the frontend,
# and create a synthetic sample video.
.\scripts\setup.ps1

# Start the local backend and frontend.
.\scripts\run.ps1
```

Open <http://localhost:3000>. The API and interactive API documentation are at <http://127.0.0.1:8000> and <http://127.0.0.1:8000/docs>.

The setup script installs Python packages into the currently selected Python environment. For isolation, create and activate a virtual environment first:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
.\scripts\setup.ps1
```

### Manual setup

```powershell
# From the project root; activate your virtual environment first if using one.
python -m pip install -r requirements.txt

Set-Location frontend
npm ci
npm run build
Set-Location ..
```

Run the backend and frontend in separate terminals:

```powershell
# Terminal 1, from the project root
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

# Terminal 2
Set-Location frontend
npm run dev
```

The frontend development server runs on port `3000`. To run the production frontend after building, use `npm run start` from `frontend`.

## Configuration and models

The backend uses local defaults defined in `backend/app/config.py`. To override settings, copy `.env.example` to `.env` and edit the values as needed. Never commit `.env` or put real credentials in `.env.example`.

Optional model weights are not included in this repository. They can take substantial disk space and may have separate licenses and terms. Review those terms before downloading or using them. See [models/README.md](./models/README.md) and run the downloader only for models you need:

```powershell
python scripts\download_models.py --model whisper --whisper-size tiny
```

The downloader and model hosts require an internet connection. Once dependencies and models are available locally, application analysis is intended to run on the local machine.

## Tests

Run the backend test scripts from the project root:

```powershell
python tests\test_backend.py
python tests\test_database_and_assets.py
python tests\test_editor.py
python tests\test_make_edit.py
```

Run the frontend production build:

```powershell
Set-Location frontend
npm run build
```

Some tests and setup steps create local database, media, or output files. These are ignored by Git.

## Repository layout

```text
backend/       FastAPI app, analysis pipelines, database, and editing APIs
frontend/      Next.js and TypeScript user interface
models/        Model setup documentation; downloaded weights are not committed
scripts/       Windows setup/launcher and sample/model utilities
tests/         Backend and editing workflow tests
storage/       Local uploaded media and database files (not committed)
outputs/       Generated project data, previews, and exports (not committed)
```

## Keeping data private

- Keep API tokens, passwords, private keys, and machine-specific settings out of source control.
- Keep personal or client videos, audio, databases, generated outputs, and model weights out of commits.
- Before publishing, review the staged file list and scan the exact commit contents for credentials and private data.
- The `.gitignore` rules are safeguards, not a substitute for reviewing every staged change.

## License

The root `package.json` declares the project license as MIT. Review and include the applicable license text and attribution before redistribution.
