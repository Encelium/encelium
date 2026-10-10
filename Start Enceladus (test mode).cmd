@echo off
rem Double-click to start Enceladus in test mode: like the dev launcher, but an
rem automated test on this computer can drive the window (port 9229, local only).
set ENCELADUS_TEST_PORT=9229
rem Uses npm.cmd, so it works even when PowerShell blocks scripts, and finds
rem Node.js even in windows opened before Node.js was installed.
cd /d "%~dp0"
where npm.cmd >nul 2>nul || (
  if exist "%ProgramFiles%\nodejs\npm.cmd" (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
  ) else (
    echo Node.js was not found. Install it, then open this file again.
    pause
    exit /b 1
  )
)
if not exist node_modules (
  echo First run: installing packages...
  call npm.cmd install || (pause & exit /b 1)
)
call npm.cmd run app
if errorlevel 1 pause
