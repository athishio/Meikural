@echo off
title Launch MEIKURAL Live Operator Dashboard
echo ===================================================
echo   MEIKURAL - SIH26104 Live Operator Dashboard
echo ===================================================
echo.
echo Opening static/index.html in default browser...
start "" "%~dp0static\index.html"
echo.
echo [OK] Dashboard launched!
echo Telemetry target: ws://localhost:8000/ws/audio
echo (If Athish's FastAPI backend is running, live WebSocket data streams automatically.)
echo (If offline, integrated simulation mode runs automatically.)
echo.
pause
