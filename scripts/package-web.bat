@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ==============================================================================
:: Step 1: Initialize paths and variables
:: ==============================================================================
set "ROOT_DIR=%~dp0.."
for %%I in ("%ROOT_DIR%") do set "ROOT_DIR=%%~fI"

echo ==> [1/5] Initializing build environment...
echo     Root directory: %ROOT_DIR%

:: Extract version from package.json using PowerShell
for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "(Get-Content -Raw '%ROOT_DIR%\package.json' | ConvertFrom-Json).version"`) do set "VERSION=%%V"
echo     App version: %VERSION%

set "OS=windows"
set "ARCH=%PROCESSOR_ARCHITECTURE%"
if /I "%ARCH%"=="AMD64" set "ARCH=x86_64"
if /I "%ARCH%"=="ARM64" set "ARCH=aarch64"
echo     Target platform: %OS%-%ARCH%

set "STAGE_DIR=%TEMP%\dist-web"
set "OUT_FILE=%TEMP%\codexia-web-%VERSION%-%OS%-%ARCH%.zip"

:: Clean up old directories safely
if exist "%STAGE_DIR%" rmdir /s /q "%STAGE_DIR%"
if exist "%OUT_FILE%" del /f /q "%OUT_FILE%"
mkdir "%STAGE_DIR%"

:: ==============================================================================
:: Step 2: Build Frontend and Backend Assets
:: ==============================================================================
echo ==> [2/5] Compiling frontend and backend...

if not defined VITE_WEB_PORT set "VITE_WEB_PORT=7420"
echo     -> Running frontend build (bun)...
call bun run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed.
    exit /b %ERRORLEVEL%
)

echo     -> Running backend build (cargo)...
call cargo build --release --bin codexia-web
if %ERRORLEVEL% neq 0 (
    echo ERROR: Cargo build failed.
    exit /b %ERRORLEVEL%
)

:: ==============================================================================
:: Step 3: Copy artifacts to staging area
:: ==============================================================================
echo ==> [3/5] Staging release artifacts...

echo     -> Copying frontend web dist...
xcopy /e /i /y "%ROOT_DIR%\dist\*" "%STAGE_DIR%\dist\" >nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to copy dist directory.
    exit /b 1
)

echo     -> Copying executable binary...
copy /y "%ROOT_DIR%\target\release\codexia-web.exe" "%STAGE_DIR%\codexia-web.exe" >nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Binary codexia-web.exe not found at target path.
    exit /b 1
)

echo     -> Generating start-server.bat...
echo @echo off> "%STAGE_DIR%\start-server.bat"
echo setlocal EnableExtensions>> "%STAGE_DIR%\start-server.bat"
echo cd /d "%%~dp0">> "%STAGE_DIR%\start-server.bat"
echo .\codexia-web.exe %%*>> "%STAGE_DIR%\start-server.bat"
echo CreateObject("Wscript.Shell").Run "cmd.exe /c start-server.bat", 0, False> "%STAGE_DIR%\silent-start.vbs"

:: ==============================================================================
:: Step 4: Verification Check Logs
:: ==============================================================================
echo ==> [4/5] Verifying staged files...
if exist "%STAGE_DIR%\dist\index.html" ( echo     [OK] dist/index.html exists. ) else ( echo     [FAIL] dist/index.html missing. && exit /b 1 )
if exist "%STAGE_DIR%\codexia-web.exe" ( echo     [OK] codexia-web.exe exists. ) else ( echo     [FAIL] codexia-web.exe missing. && exit /b 1 )
if exist "%STAGE_DIR%\start-server.bat" ( echo     [OK] start-server.bat exists.) else ( echo     [FAIL] start-server.bat missing.&& exit /b 1 )

:: ==============================================================================
:: Step 5: Packaging into ZIP archive
:: ==============================================================================
echo ==> [5/5] Creating final zip archive...
powershell -NoProfile -Command "Get-ChildItem '%STAGE_DIR%\*' | Compress-Archive -DestinationPath '%OUT_FILE%' -Force"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to create zip archive.
    exit /b %ERRORLEVEL%
)

echo ==> Process completed successfully.
echo Wrote %OUT_FILE%
endlocal