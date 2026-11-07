# ==============================================================================
# FAMONEMEDIA Reverse AI - Local Application Launcher
# Run this in the VS Code PowerShell terminal: .\scripts\run.ps1
# ==============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Starting FAMONEMEDIA Reverse AI (Local CPU Engine)" -ForegroundColor Cyan
Write-Host " Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host " Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host " Press Ctrl+C in this terminal to stop both servers." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$Root = Resolve-Path "$PSScriptRoot\.."

# Start Backend in background process
Write-Host "Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "python" -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $Root -PassThru

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Next.js Frontend on port 3000..." -ForegroundColor Yellow
Set-Location -Path "$Root\frontend"

try {
    npm run start
} finally {
    Write-Host "Shutting down servers..." -ForegroundColor Yellow
    if ($backendJob -and !$backendJob.HasExited) {
        Stop-Process -Id $backendJob.Id -Force
    }
    Set-Location -Path $Root
    Write-Host "All processes stopped cleanly." -ForegroundColor Green
}
