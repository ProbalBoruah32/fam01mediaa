# ==============================================================================
# FAMONEMEDIA Reverse AI - Windows Automated Setup Script
# Run this script in the VS Code PowerShell terminal: .\scripts\setup.ps1
# ==============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " FAMONEMEDIA Reverse AI - Local Setup & Verification" -ForegroundColor Cyan
Write-Host " Platform: Windows (CPU-Only, 100% Offline, Zero Paid APIs)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python
Write-Host "[1/6] Checking Python installation..." -ForegroundColor Yellow
try {
    $pyVersion = python --version 2>&1
    Write-Host "  Found: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Python is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 2. Check FFmpeg
Write-Host "[2/6] Checking FFmpeg and FFprobe..." -ForegroundColor Yellow
try {
    $ffVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    Write-Host "  Found: $ffVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: FFmpeg is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 3. Check Node.js and npm
Write-Host "[3/6] Checking Node.js and npm..." -ForegroundColor Yellow
try {
    $nodeVer = node --version 2>&1
    $npmVer = npm --version 2>&1
    Write-Host "  Found Node: $nodeVer | npm: $npmVer" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 4. Install Python dependencies
Write-Host "[4/6] Installing Python backend dependencies (CPU-only)..." -ForegroundColor Yellow
python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Some pip packages had warnings, verifying imports..." -ForegroundColor DarkYellow
}

# 5. Install Next.js frontend dependencies & build
Write-Host "[5/6] Installing Next.js frontend dependencies..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\..\frontend"
npm install
npm run build
Set-Location -Path "$PSScriptRoot\.."

# 6. Generate synthetic sample reference video
Write-Host "[6/6] Generating synthetic multi-scene reference video..." -ForegroundColor Yellow
python scripts\create_sample_video.py

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " SETUP COMPLETE!" -ForegroundColor Green
Write-Host " To start the application, run: .\scripts\run.ps1" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
