@echo off
title SmartQP - AI Question Paper Generator
echo ========================================================
echo   Starting SmartQP - AI Question Paper Generator
echo ========================================================
echo.
echo Application URL: http://localhost:8000
echo API Docs:        http://localhost:8000/docs
echo.
echo Press Ctrl+C in this window anytime to stop the server.
echo.
cd /d "%~dp0backend"
"..\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
