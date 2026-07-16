@echo off
chcp 65001 >nul
title 启动磁力片APP

echo.
echo ============================
echo    亲子磁力片 - 启动脚本
echo ============================
echo.

set PORT=5174
set PID_FILE=server.pid
set BASE_DIR=%~dp0

cd /d "%BASE_DIR%"

echo [1/4] 检查项目目录...
if not exist "package.json" (
    echo 错误：未找到 package.json，请确认脚本位置
    pause
    exit /b 1
)
echo  ✓ 项目目录正确

echo.
echo [2/4] 检查依赖安装...
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo 错误：依赖安装失败
        pause
        exit /b 1
    )
    echo  ✓ 依赖安装完成
) else (
    echo  ✓ 依赖已安装
)

echo.
echo [3/4] 检查端口 %PORT%...
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo  ！端口 %PORT% 已被占用，尝试直接打开页面
    echo.
    echo [4/4] 打开浏览器...
    start "" "http://localhost:%PORT%"
    echo  ✓ 页面已打开
    echo.
    echo 提示：服务已在运行，可使用"停止磁力片APP.cmd"停止服务
    pause
    exit /b 0
)

echo  ✓ 端口可用

echo.
echo [4/4] 启动开发服务器...
echo 正在启动 Vite 开发服务器（端口 %PORT%）...

start /min npm run dev

echo 等待服务器启动...
set WAIT_COUNT=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a WAIT_COUNT+=1

curl -s -o nul -w "%{http_code}" "http://localhost:%PORT%" | findstr "200" >nul
if %errorlevel% equ 0 (
    echo  ✓ 服务器已启动
    goto SERVER_READY
)

if %WAIT_COUNT% geq 30 (
    echo  ！服务器启动超时，请检查控制台错误
    pause
    exit /b 1
)

echo  等待中 (%WAIT_COUNT%/30)...
goto WAIT_LOOP

:SERVER_READY
echo.
echo 打开浏览器...
start "" "http://localhost:%PORT%"

echo.
echo ============================
echo    启动成功！
echo ============================
echo 访问地址：http://localhost:%PORT%
echo.
echo 如需停止服务，请运行"停止磁力片APP.cmd"
echo.
