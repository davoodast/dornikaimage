@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

echo.
echo ==========================================
echo   DornikaImage -- Build Script
echo ==========================================
echo.

set "ROOT=%~dp0.."
set "APPDIR=%~dp0app"

:: 1. Remove old output
if exist "%APPDIR%" (
    echo [1/6] Removing old deploy\app ...
    rmdir /s /q "%APPDIR%"
    if errorlevel 1 ( echo [!] Could not remove deploy\app & exit /b 1 )
)
mkdir "%APPDIR%"

:: 2. Build Next.js
echo [2/6] Building Next.js ...
cd /d "%ROOT%"
call npm run build
if errorlevel 1 ( echo [!] npm run build failed & exit /b 1 )

:: 3. Copy standalone
echo [3/6] Copying standalone output ...
if not exist "%ROOT%\.next\standalone" (
    echo [!] .next\standalone not found. Check output:standalone in next.config.js
    exit /b 1
)
xcopy /e /i /q /y "%ROOT%\.next\standalone" "%APPDIR%\"
if errorlevel 1 ( echo [!] xcopy standalone failed & exit /b 1 )

:: 4. Copy static assets
echo [4/6] Copying static assets ...
if not exist "%APPDIR%\.next\static" mkdir "%APPDIR%\.next\static"
xcopy /e /i /q /y "%ROOT%\.next\static" "%APPDIR%\.next\static\"
if errorlevel 1 ( echo [!] xcopy static failed & exit /b 1 )

:: 5. Copy public\
echo [5/6] Copying public\ ...
xcopy /e /i /q /y "%ROOT%\public" "%APPDIR%\public\"
if errorlevel 1 ( echo [!] xcopy public failed & exit /b 1 )

:: 6. Copy worker.cjs
echo [6/6] Copying worker.cjs ...
if not exist "%APPDIR%\src\lib\compression" mkdir "%APPDIR%\src\lib\compression"
copy /y "%ROOT%\src\lib\compression\worker.cjs" "%APPDIR%\src\lib\compression\" >nul
if errorlevel 1 ( echo [!] copy worker.cjs failed & exit /b 1 )

:: Copy .env.local if present
if exist "%ROOT%\.env.local" (
    copy /y "%ROOT%\.env.local" "%APPDIR%\" >nul
    echo    .env.local copied OK
) else (
    echo    [!] .env.local not found -- copy it to deploy\app\ before running start.bat
)

echo.
echo ==========================================
echo   Build complete: deploy\app\
echo   To run: deploy\start.bat
echo ==========================================
echo.
endlocal
