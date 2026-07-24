@echo off
chcp 65001 >nul
title 启动亲子磁力片网站

echo.
echo ████████████████████████████████████████████████████████████████
echo █                    亲子磁力片网站启动器                      █
echo ████████████████████████████████████████████████████████████████
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [1/5] 检查 Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  未找到 Node.js，请先安装：
    echo    https://nodejs.org/ (选择 LTS 版本)
    echo.
    echo 安装后需要重启电脑才能生效。
    pause
    exit /b 1
)
echo ✓ Node.js 已安装

echo.
echo [2/5] 检查 npm 环境...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  未找到 npm，请检查 Node.js 安装是否完整。
    pause
    exit /b 1
)
echo ✓ npm 已安装

echo.
echo [3/5] 检查项目目录...
if not exist "%PROJECT_DIR%package.json" (
    echo.
    echo ❌ 未找到项目文件，请确保本脚本位于项目根目录。
    pause
    exit /b 1
)
echo ✓ 项目目录正常

echo.
echo [4/5] 检查依赖...
if not exist "%PROJECT_DIR%node_modules" (
    echo ⏳ 正在安装依赖（首次安装可能需要几分钟）...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 依赖安装失败，请检查网络连接或运行日志。
        pause
        exit /b 1
    )
)
echo ✓ 依赖检查完成

echo.
echo [5/5] 启动开发服务器...
echo.
echo 服务将运行在: http://localhost:5174
echo 按 Ctrl+C 可停止服务
echo.

start "" http://localhost:5174
call npm run start-site

pause
