@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: DornikaImage -- Portable Builder v2
:: Self-contained: no external file dependencies
:: Output folder created next to project folder

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "OUTDIR_REL=%ROOT%\..\dornikaimage-portable"

echo.
echo ==========================================
echo   DornikaImage Portable Builder v2
echo ==========================================
echo   Project : %ROOT%
echo.

:: ---- [0] Check Node.js ----
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 20 LTS first.
    pause & exit /b 1
)

:: ---- [0] Check npm ----
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found.
    pause & exit /b 1
)

:: ---- [0] Check .env.local ----
if not exist "%ROOT%\.env.local" (
    echo [ERROR] .env.local not found. Create it before building portable package.
    pause & exit /b 1
)

:: ---- [1/6] npm install ----
if not exist "%ROOT%\node_modules" (
    echo [1/6] Installing npm dependencies...
    cd /d "%ROOT%"
    call npm install
    if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )
) else (
    echo [1/6] node_modules OK, skipping install.
)

:: ---- [2/6] Build ----
echo [2/6] Building project (npm run build)...
cd /d "%ROOT%"
call npm run build
if errorlevel 1 (
    echo [ERROR] npm run build failed.
    pause & exit /b 1
)

if not exist "%ROOT%\.next\standalone\server.js" (
    echo [ERROR] .next\standalone\server.js not found after build.
    echo         Make sure output:'standalone' is set in next.config.js
    pause & exit /b 1
)

:: ---- [3/6] Create output dir + resolve absolute path ----
echo [3/6] Preparing output directory...
if exist "%OUTDIR_REL%" (
    echo       Removing previous build...
    rmdir /s /q "%OUTDIR_REL%"
    if errorlevel 1 ( echo [ERROR] Cannot remove old folder. Is it in use? & pause & exit /b 1 )
)
mkdir "%OUTDIR_REL%"
if errorlevel 1 ( echo [ERROR] Cannot create output dir. & pause & exit /b 1 )

:: Resolve .. to get true absolute path (needed for copy and > redirect)
pushd "%OUTDIR_REL%"
set "OUTDIR=%CD%"
popd
echo       Created: %OUTDIR%

:: ---- [4/6] Copy files ----
echo [4/6] Copying files...

echo       [4a] standalone server + bundled node_modules...
xcopy "%ROOT%\.next\standalone\*" "%OUTDIR%\" /E /I /Y /Q
if errorlevel 1 ( echo [ERROR] xcopy standalone failed. & pause & exit /b 1 )

echo       [4b] .next\static (CSS, JS chunks, fonts, images)...
if exist "%ROOT%\.next\static" (
    xcopy "%ROOT%\.next\static\*" "%OUTDIR%\.next\static\" /E /I /Y /Q
)

echo       [4c] public (icons, fonts, manifest, sw.js, logo)...
if exist "%ROOT%\public" (
    xcopy "%ROOT%\public\*" "%OUTDIR%\public\" /E /I /Y /Q
)

echo       [4d] worker.cjs (compression worker thread)...
if not exist "%OUTDIR%\src\lib\compression" mkdir "%OUTDIR%\src\lib\compression"
if exist "%ROOT%\src\lib\compression\worker.cjs" (
    copy /Y "%ROOT%\src\lib\compression\worker.cjs" "%OUTDIR%\src\lib\compression\worker.cjs" >nul
    echo         OK: worker.cjs copied.
) else (
    echo [WARN] worker.cjs not found - compression will not work!
)

echo       [4e] .env.local...
copy /Y "%ROOT%\.env.local" "%OUTDIR%\.env.local" >nul
if errorlevel 1 ( echo [WARN] .env.local copy failed. )

echo       [4f] data (SQLite DB)...
if exist "%ROOT%\data" (
    xcopy "%ROOT%\data\*" "%OUTDIR%\data\" /E /I /Y /Q
) else (
    mkdir "%OUTDIR%\data"
)

echo       [4g] runtime dirs (uploads, compressed, logs)...
if not exist "%OUTDIR%\uploads"    mkdir "%OUTDIR%\uploads"
if not exist "%OUTDIR%\compressed" mkdir "%OUTDIR%\compressed"
if not exist "%OUTDIR%\logs"       mkdir "%OUTDIR%\logs"

echo       [4h] Patch prerender manifest for dynamic home settings...
if exist "%OUTDIR%\.next\prerender-manifest.json" (
    powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$f='%OUTDIR%\\.next\\prerender-manifest.json'; $j=Get-Content -Raw -Path $f | ConvertFrom-Json; if ($j.routes.PSObject.Properties.Name -contains '/') { $j.routes.PSObject.Properties.Remove('/'); [System.IO.File]::WriteAllText($f, ($j | ConvertTo-Json -Depth 100 -Compress), (New-Object System.Text.UTF8Encoding($false))); Write-Host '[info] home route removed from prerender manifest'; } else { Write-Host '[info] home route already dynamic'; }"
)

:: ---- [5/6] Write start.bat ----
echo [5/6] Writing start.bat and stop.bat...

> "%OUTDIR%\start.bat" (
    echo @echo off
    echo setlocal EnableExtensions
    echo chcp 65001 ^>nul 2^>^&1
    echo.
    echo set "APPDIR=%%~dp0"
    echo if "%%APPDIR:~-1%%"=="\" set "APPDIR=%%APPDIR:~0,-1%%"
    echo set PORT=3001
    echo set "LOGFILE=%%APPDIR%%\logs\runtime.log"
    echo.
    echo where node ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo [ERROR] Node.js not found. Install Node.js 20 LTS.
    echo     pause ^& exit /b 1
    echo ^)
    echo.
    echo if not exist "%%APPDIR%%\.env.local" ^(
    echo     echo [ERROR] .env.local not found next to this folder.
    echo     pause ^& exit /b 1
    echo ^)
    echo.
    echo echo ==========================================
    echo echo   DornikaImage Portable Server
    echo echo ==========================================
    echo echo   URL  : http://localhost:%%PORT%%
    echo echo   Log  : %%LOGFILE%%
    echo echo   Stop : stop.bat
    echo echo.
    echo.
    echo cd /d "%%APPDIR%%"
    echo set NODE_ENV=production
    echo set HOSTNAME=0.0.0.0
    echo.
    echo node server.js ^>^> "%%LOGFILE%%" 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo [ERROR] Server stopped with error. Check: %%LOGFILE%%
    echo     pause
    echo ^)
    echo endlocal
)

> "%OUTDIR%\stop.bat" (
    echo @echo off
    echo setlocal EnableExtensions
    echo chcp 65001 ^>nul 2^>^&1
    echo.
    echo set "PORT=3001"
    echo set "FOUND=0"
    echo.
    echo for /f "tokens=*" %%%%a in ^('powershell -NoProfile -Command "^(Get-NetTCPConnection -LocalPort %%PORT%% -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess^)"'^) do ^(
    echo     set "FOUND=1"
    echo     echo Stopping PID %%%%a on port %%PORT%%...
    echo     taskkill /f /pid %%%%a ^>nul 2^>^&1
    echo ^)
    echo.
    echo if "%%FOUND%%"=="0" ^(
    echo     echo [i] No process found on port %%PORT%%
    echo     exit /b 0
    echo ^)
    echo echo [ok] Server stopped.
    echo endlocal
)

:: ---- [6/6] README ----
echo [6/6] Writing README-portable.txt...
> "%OUTDIR%\README-portable.txt" (
    echo DornikaImage -- Portable Package
    echo =================================
    echo.
    echo Requirements: Node.js 20 LTS (https://nodejs.org)
    echo.
    echo Getting started:
    echo   1. Copy this entire folder to the target machine.
    echo   2. Run start.bat
    echo   3. Open http://localhost:3001 in browser.
    echo   4. To stop the server: run stop.bat
    echo.
    echo Folder contents:
    echo   server.js                       Next.js standalone server
    echo   .next\static\                   CSS, JS chunks, fonts (build output)
    echo   public\                         Icons, fonts, manifest, service worker
    echo   src\lib\compression\worker.cjs  Compression worker thread
    echo   .env.local                      Environment config (editable)
    echo   data\                           SQLite database
    echo   uploads\                        Temp uploaded files
    echo   compressed\                     Compressed output files
    echo   logs\                           Runtime logs
    echo   start.bat                       Start server (port 3001)
    echo   stop.bat                        Stop server
)

:: ---- Done ----
echo.
echo ==========================================
echo   Portable package ready!
echo ==========================================
echo   Output : %OUTDIR%
echo.
echo   On target machine:
echo     1. Copy the dornikaimage-portable folder
echo     2. Install Node.js 20 LTS
echo     3. Run start.bat
echo     4. Open http://localhost:3001
echo.
pause
endlocal