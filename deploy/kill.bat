@echo off
setlocal
chcp 65001 >nul 2>&1

set "PORT=3001"

echo.
echo ==========================================
echo   DornikaImage -- Stopping port %PORT%
echo ==========================================
echo.

set "APPPID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr " 0.0.0.0:%PORT% \| 127.0.0.1:%PORT% \| \[::\]:%PORT% "') do (
    set "APPPID=%%a"
)

if "%APPPID%"=="" (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%PORT% "') do (
        set "APPPID=%%a"
    )
)

if "%APPPID%"=="" (
    echo   No process found on port %PORT%.
    echo.
    exit /b 0
)

echo   Stopping PID %APPPID% ...
taskkill /f /pid %APPPID% >nul 2>&1
if errorlevel 1 (
    echo   [!] Could not stop PID %APPPID% -- try running as Administrator
    exit /b 1
) else (
    echo   OK - port %PORT% is now free.
)

echo.
endlocal
