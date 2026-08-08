@echo off
chcp 65001 >nul
title Magnetic Blocks Dev Server
REM Internal startup script - called by VBS launcher
cd /d "%~dp0"

REM Check node availability
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ============================================
    echo   ERROR: Node.js not found
    echo   Please install Node.js: https://nodejs.org/
    echo ============================================
    pause
    exit /b 1
)

REM Install dependencies if missing
if not exist "node_modules\.bin\vite.cmd" (
    echo ============================================
    echo   Installing dependencies...
    echo ============================================
    call npm install
    if %errorlevel% neq 0 (
        echo ============================================
        echo   ERROR: npm install failed
        echo ============================================
        pause
        exit /b 1
    )
)

REM Start dev server
call npm run start-site

REM Pause on abnormal exit
if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   Dev server exited with code: %errorlevel%
    echo ============================================
    pause
)
