@echo off
chcp 65001 >nul
REM Internal startup script - called by 启动磁力片网站.vbs
REM Do not delete this file - it is required for the VBS launcher to work
cd /d "%~dp0"
call npm run start-site
