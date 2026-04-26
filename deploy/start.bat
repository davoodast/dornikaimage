@echo off
setlocal
chcp 65001 >nul 2>&1

set "APPDIR=%~dp0app"
set "PORT=3001"

echo.
echo ==========================================
echo   DornikaImage -- Starting on port %PORT%
echo ==========================================
echo.

if not exist "%APPDIR%\server.js" (
    echo [!] deploy\app\server.js not found.
    echo     Run build first: deploy\build.bat
    echo.
    exit /b 1
)

if not exist "%APPDIR%\.env.local" (
    echo [!] deploy\app\.env.local not found.
    echo     Copy your .env.local into deploy\app\
    echo.
    exit /b 1
)

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /r ":%PORT% .*LISTENING"') do (
    echo [!] Port %PORT% is already in use (PID %%a^).
    echo     Stop it first: deploy\kill.bat
    echo.
    exit /b 1
)

echo   URL   : http://localhost:%PORT%
echo   Stop  : deploy\kill.bat  or  Ctrl+C
echo.

set PORT=%PORT%
set HOSTNAME=0.0.0.0

cd /d "%APPDIR%"
node server.js
endlocal
