@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT_DIR=%~dp0.."
for %%I in ("%ROOT_DIR%") do set "ROOT_DIR=%%~fI"

for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "(Get-Content -Raw '%ROOT_DIR%\package.json' | ConvertFrom-Json).version"`) do set "VERSION=%%V"

set "OS=windows"
set "ARCH=%PROCESSOR_ARCHITECTURE%"
if /I "%ARCH%"=="AMD64" set "ARCH=x86_64"
if /I "%ARCH%"=="ARM64" set "ARCH=aarch64"

set "STAGE_DIR=%TEMP%\dist-web"
set "OUT_FILE=%TEMP%\codexia-web-%VERSION%-%OS%-%ARCH%.zip"

if exist "%STAGE_DIR%" rmdir /s /q "%STAGE_DIR%"
if exist "%OUT_FILE%" del /f /q "%OUT_FILE%"
mkdir "%STAGE_DIR%"

if not defined VITE_WEB_PORT set "VITE_WEB_PORT=7420"
call bun run build || exit /b 1
call cargo build --release --manifest-path "%ROOT_DIR%\src-tauri\Cargo.toml" || exit /b 1

xcopy /e /i /y "%ROOT_DIR%\dist\*" "%STAGE_DIR%\dist\" >nul || exit /b 1
copy /y "%ROOT_DIR%\src-tauri\target\release\codexia.exe" "%STAGE_DIR%\codexia.exe" >nul || exit /b 1

powershell -NoProfile -Command "Compress-Archive -Path '%STAGE_DIR%\*' -DestinationPath '%OUT_FILE%' -Force" || exit /b 1
echo Wrote %OUT_FILE%
