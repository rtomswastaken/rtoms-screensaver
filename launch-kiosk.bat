@echo off
:: ============================================================================
:: RTOMS: Windows Kiosk Mode Launcher
:: Launches the CRT Ambient Dashboard in full-screen kiosk mode with no browser
:: borders, address bars, tabs, or toolbars.
::
:: To exit kiosk mode at any time, press: Alt + F4
:: ============================================================================

title RTOMS CRT Dashboard Kiosk Launcher
cls

:: Resolve absolute path of index.html in the current directory
set "HTML_PATH=%~dp0index.html"
set "HTML_URL=file:///%HTML_PATH:\=/%"

echo ===================================================================
echo   RTOMS: Starting Retro CRT Ambient Dashboard Kiosk Mode...
echo ===================================================================
echo Target: %HTML_URL%
echo.
echo Controls:
echo   - [Alt + F4] : Exit Kiosk Mode
echo   - [T]        : Cycle Phosphor Theme (Amber / Green / Cyan / Mono)
echo   - [Space]    : Pause / Resume Telemetry stream
echo   - [F]        : Toggle Fullscreen
echo   - [R]        : Force Refresh Kanjirappally Live Weather
echo   - [H]        : Toggle CRT Curved / Flat Glass Mode
echo ===================================================================
echo.

:: 1. Try Microsoft Edge (Default on Windows 10 / 11)
where msedge >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Launching with Microsoft Edge Kiosk Mode...
    start "" msedge --kiosk "%HTML_URL%" --edge-kiosk-type=fullscreen --no-first-run --disable-pinch --disable-features=Translate
    goto :Done
)

:: Check standard Microsoft Edge installation locations
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    echo Launching with Microsoft Edge (x86)...
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "%HTML_URL%" --edge-kiosk-type=fullscreen --no-first-run --disable-pinch
    goto :Done
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo Launching with Microsoft Edge...
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk "%HTML_URL%" --edge-kiosk-type=fullscreen --no-first-run --disable-pinch
    goto :Done
)

:: 2. Fallback: Google Chrome
where chrome >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Launching with Google Chrome Kiosk Mode...
    start "" chrome --kiosk "%HTML_URL%" --no-first-run --disable-pinch
    goto :Done
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    echo Launching with Google Chrome...
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk "%HTML_URL%" --no-first-run --disable-pinch
    goto :Done
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    echo Launching with Google Chrome (x86)...
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk "%HTML_URL%" --no-first-run --disable-pinch
    goto :Done
)

:: 3. Universal Fallback: Open with default system browser
echo Warning: Dedicated kiosk browser executable not found. Opening in default browser...
start "" "%HTML_PATH%"

:Done
exit /b 0
