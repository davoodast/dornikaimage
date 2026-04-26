@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"
set "PORT=3001"
set "LOGFILE=%APPDIR%\logs\runtime.log"

where node >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js پيدا نشد. Node.js 20 يا بالاتر را نصب کن.
    exit /b 1
)

if not exist "%APPDIR%\.env.local" (
    echo [!] فایل .env.local کنار نسخه portable پيدا نشد.
    exit /b 1
)

echo ==========================================
echo   DornikaImage Portable Server
echo ==========================================
echo   URL     : http://localhost:%PORT%
echo   Log     : %LOGFILE%
echo   Stop    : kill-portable.bat
echo.

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$env:PORT='3001'; $env:HOSTNAME='0.0.0.0'; Set-Location '%APPDIR%'; & node .\server.js 2>&1 | Tee-Object -FilePath '.\logs\runtime.log' -Append"

endlocal