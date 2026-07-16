@echo off
chcp 65001 >nul
title 停止磁力片APP

echo.
echo ============================
echo    亲子磁力片 - 停止脚本
echo ============================
echo.

set PID_FILE=server.pid
set BASE_DIR=%~dp0

cd /d "%BASE_DIR%"

echo [1/3] 检查PID文件...
if not exist "%PID_FILE%" (
    echo  ！未找到 server.pid 文件
    echo  尝试查找正在运行的Vite进程...
    goto FIND_PROCESS
)

echo [2/3] 读取PID并停止进程...
set /p PID=<"%PID_FILE%"

echo 读取到PID: %PID%

tasklist /FI "PID eq %PID%" | findstr "%PID%" >nul
if %errorlevel% equ 0 (
    echo 正在停止进程 %PID%...
    taskkill /PID %PID% /F >nul
    if %errorlevel% equ 0 (
        echo  ✓ 进程已停止
        del "%PID_FILE%"
    ) else (
        echo  ！停止进程失败
        goto FIND_PROCESS
    )
) else (
    echo  ！进程 %PID% 不存在
    del "%PID_FILE%"
    goto FIND_PROCESS
)

goto STOP_SUCCESS

:FIND_PROCESS
echo.
echo [3/3] 搜索相关进程...

tasklist | findstr "node.exe" >nul
if %errorlevel% equ 0 (
    echo 找到以下 node.exe 进程：
    tasklist | findstr "node.exe"
    echo.
    echo 警告：本脚本仅停止记录在 server.pid 的进程
    echo 如果需要停止其他 node.exe 进程，请手动操作
) else (
    echo  ✓ 未找到 node.exe 进程
)

:STOP_SUCCESS
echo.
echo ============================
echo    停止完成！
echo ============================
echo.
pause
