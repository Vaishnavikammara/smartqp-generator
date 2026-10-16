Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting SmartQP - AI Question Paper Generator" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Web Application:   http://localhost:8000" -ForegroundColor Yellow
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server.`n" -ForegroundColor Gray

Set-Location -Path "$PSScriptRoot\backend"
& "$PSScriptRoot\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
