@echo off
title SmartQP - Public Access Tunnel
echo ========================================================
echo   Starting SmartQP Public Access Tunnel
echo ========================================================
echo.
echo Forwarding http://localhost:8000 to a free, secure public HTTPS URL...
echo.
"%~dp0bin\cloudflared.exe" tunnel --url http://127.0.0.1:8000
pause
