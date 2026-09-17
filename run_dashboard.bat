@echo off
title Launch MEIKURAL Live Operator Dashboard
echo ===================================================
echo   MEIKURAL - Live Enterprise Voice Security SOC
echo ===================================================
echo.

netstat -ano | findstr :8000 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Starting MEIKURAL FastAPI backend on http://127.0.0.1:8000...
    start "MEIKURAL Backend Server" /min "%~dp0.venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] MEIKURAL Backend is already active on port 8000.
)

echo.
echo Opening MEIKURAL Dashboard in default browser...
start "" "http://127.0.0.1:8000/dashboard"
echo.
echo [OK] Dashboard launched: http://127.0.0.1:8000/dashboard
echo [OK] WebSocket endpoint: ws://127.0.0.1:8000/ws/audio
echo.
timeout /t 5

