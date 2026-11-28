@echo off
rem TEST MODE — the agent may write anywhere on this PC, and Rewind does NOT
rem protect outside writes. For prompt tests and model evaluation only.
rem Never set ENCELIUM_ALLOW_ANYWHERE in released builds.
set ENCELIUM_ALLOW_ANYWHERE=1
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
