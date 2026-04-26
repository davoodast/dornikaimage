@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "OUTDIR=%ROOT%\..\portable-files"

echo.
echo ==========================================
echo   DornikaImage Portable Builder
echo ==========================================
echo   Project : %ROOT%
echo   Output  : %OUTDIR%
echo.

:: --- پیش‌نیازها ---

where node >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js پيدا نشد. اول Node.js 20 يا بالاتر را نصب کن.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [!] npm پيدا نشد.
    pause
    exit /b 1
)

if not exist "%ROOT%\.env.local" (
    echo [!] فایل .env.local پيدا نشد.
    echo     قبل از ساخت نسخه portable، env پروژه را کامل کن.
    pause
    exit /b 1
)

if not exist "%ROOT%\node_modules" (
    echo [0/5] Installing dependencies...
    cd /d "%ROOT%"
    npm install
    if errorlevel 1 (
        echo [!] npm install ناموفق بود.
        pause
        exit /b 1
    )
)

echo [1/5] Building project ^(npm run build^)...
cd /d "%ROOT%"
npm run build
if errorlevel 1 (
    echo [!] npm run build ناموفق بود. خطاها را بررسی کن.
    pause
    exit /b 1
)

if not exist "%ROOT%\.next\standalone\server.js" (
    echo [!] بعد از build، فایل .next\standalone\server.js پيدا نشد.
    echo     مطمئن شو که output: 'standalone' در next.config.js تنظيم است.
    pause
    exit /b 1
)

echo [2/5] Recreating portable folder...
if exist "%OUTDIR%" (
    echo       حذف پوشه قبلی...
    rmdir /s /q "%OUTDIR%"
)
mkdir "%OUTDIR%"
if errorlevel 1 (
    echo [!] نتوانست پوشه portable-files را بسازد: %OUTDIR%
    pause
    exit /b 1
)
echo       ساخته شد: %OUTDIR%

echo [3/5] Copying standalone server...
xcopy "%ROOT%\.next\standalone\*" "%OUTDIR%\" /E /I /Y
if errorlevel 1 (
    echo [!] کپی standalone ناموفق بود.
    pause
    exit /b 1
)

echo       Copying .next/static...
if exist "%ROOT%\.next\static" (
    xcopy "%ROOT%\.next\static\*" "%OUTDIR%\.next\static\" /E /I /Y
)

echo       Copying public...
if exist "%ROOT%\public" (
    xcopy "%ROOT%\public\*" "%OUTDIR%\public\" /E /I /Y
)

echo       Copying .env.local...
copy /Y "%ROOT%\.env.local" "%OUTDIR%\.env.local"

echo       Copying data...
if exist "%ROOT%\data" (
    xcopy "%ROOT%\data\*" "%OUTDIR%\data\" /E /I /Y
) else (
    mkdir "%OUTDIR%\data"
)

echo       Creating uploads/compressed/logs folders...
if not exist "%OUTDIR%\uploads"    mkdir "%OUTDIR%\uploads"
if not exist "%OUTDIR%\compressed" mkdir "%OUTDIR%\compressed"
if not exist "%OUTDIR%\logs"       mkdir "%OUTDIR%\logs"

echo [4/5] Writing portable run/kill helpers...
copy /Y "%ROOT%\scripts\portable-run-template.bat" "%OUTDIR%\run-portable.bat"
if errorlevel 1 (
    echo [!] ساخت run-portable.bat ناموفق بود.
    pause
    exit /b 1
)

copy /Y "%ROOT%\scripts\portable-kill-template.bat" "%OUTDIR%\kill-portable.bat"
if errorlevel 1 (
    echo [!] ساخت kill-portable.bat ناموفق بود.
    pause
    exit /b 1
)

(
    echo DornikaImage Portable Package
    echo ============================
    echo.
    echo 1. روی سیستم مقصد Node.js 20 یا بالاتر نصب باشد.
    echo 2. پوشه portable-files را کامل کپی کن.
    echo 3. برای اجرا run-portable.bat را باز کن.
    echo 4. برای توقف kill-portable.bat را اجرا کن.
    echo 5. پروژه روی http://localhost:3001 بالا می‌آید.
    echo.
    echo محتویات این پوشه شامل server standalone، فایل‌های public، CSS/JSهای build شده، env، data، uploads و compressed است.
) > "%OUTDIR%\README-portable.txt"

echo [5/5] Portable package is ready.
echo.
echo مسیر خروجی:
echo %OUTDIR%
echo.
echo برای اجرا روی سیستم دیگر:
echo   1. کل پوشه portable-files را کپی کن
echo   2. Node.js 20+ نصب کن
echo   3. run-portable.bat را اجرا کن
echo   4. برای توقف kill-portable.bat را بزن
echo.
pause
endlocal