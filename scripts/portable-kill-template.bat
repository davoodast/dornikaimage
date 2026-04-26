@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "PORT=3001"
set "FOUND=0"

for /f %%a in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)"') do (
    set "FOUND=1"
    echo Stopping PID %%a on port %PORT% ...
    taskkill /f /pid %%a >nul 2>&1
)

if "%FOUND%"=="0" (
    echo [i] هیچ پردازه‌ای روی پورت %PORT% پيدا نشد.
    exit /b 0
)

echo [ok] سرور متوقف شد.
endlocal