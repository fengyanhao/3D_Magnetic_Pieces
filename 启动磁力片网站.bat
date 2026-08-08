@echo off
chcp 65001 >nul
title Magnetic Blocks Launcher
cd /d "%~dp0"

REM Check if service is already running (use TcpClient to bypass proxy)
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $iar = $c.BeginConnect('localhost', 5174, $null, $null); if ($iar.AsyncWaitHandle.WaitOne(2000) -and $c.Connected) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel% equ 0 (
    start "" "http://localhost:5174"
    exit /b 0
)

REM Start dev server in background (minimized window)
start "Dev Server" /min _start_internal.bat

REM Wait for service to be ready, then open browser
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_wait_and_open.ps1"
