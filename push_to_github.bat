@echo off
title Push Meikural Live Dashboard to GitHub
echo ===================================================
echo   MEIKURAL - SIH26104 Dashboard Git Push Helper
echo ===================================================
echo.
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"

echo Checking Git Status...
git status
echo.
echo Pushing branch 'main' to https://github.com/athishio/Meikural.git...
git push origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Dashboard successfully pushed to GitHub!
) else (
    echo [INFO] If prompted, please enter your GitHub Personal Access Token or sign in via browser.
)
echo.
pause
