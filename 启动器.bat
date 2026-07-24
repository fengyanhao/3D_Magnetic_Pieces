@echo off
chcp 65001 >nul
title 亲子磁力片启动器

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [1/3] 检查 Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未找到 Node.js，请先安装：https://nodejs.org/ (选择 LTS 版本)
    pause
    exit /b 1
)

echo [2/3] 启动启动器服务...
start /min cmd /c "cd /d "%PROJECT_DIR%" && node scripts\launcher.cjs"

echo [3/3] 正在打开启动页面...
timeout /t 2 /nobreak >nul
start "" http://localhost:5175

echo 启动器已启动，请在浏览器中点击按钮启动网站。
echo 如果浏览器未自动打开，请手动访问：http://localhost:5175
