# FAMONEMEDIA — Production Deployment Guide

## 1. System Requirements

* **Operating System**: Windows 10/11, Ubuntu 22.04 LTS, or macOS 13+
* **Processor (CPU)**: 4 physical cores minimum (8 logical cores recommended)
* **Memory (RAM)**: 8 GB minimum (16 GB recommended for high-definition video processing)
* **Disk Storage**: 10 GB free space on SSD
* **GPU**: None required (all processing executes locally on CPU)
* **System Binaries**: `ffmpeg` and `ffprobe` installed and added to system PATH.

---

## 2. Local Environment Setup

### Backend (FastAPI / Python 3.11)
```bash
# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows PowerShell
# source venv/bin/activate # Linux / macOS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch the API server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend (Next.js 14)
```bash
# 1. Enter frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Build optimized production assets
npm run build

# 4. Start production server
npm run start -p 3000
```

---

## 3. Docker Deployment

### `docker-compose.yml`
```yaml
version: "3.9"

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ./storage:/app/storage
      - ./outputs:/app/outputs
      - ./models:/app/models
    environment:
      - HOST=0.0.0.0
      - PORT=8000
      - MAX_CPU_THREADS=8
      - DATABASE_URL=sqlite:////app/storage/famonemedia.db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

---

## 4. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Backend binding address |
| `PORT` | `8000` | Backend port |
| `MAX_CPU_THREADS` | `8` | Maximum CPU worker threads |
| `DATABASE_URL` | `sqlite:///storage/famonemedia.db` | Database connection string |
| `FAL_KEY` | *(optional)* | Backend secret key for fal.ai cloud inference |
| `NEXT_PUBLIC_API_URL`| `http://127.0.0.1:8000` | Frontend backend API URL |
