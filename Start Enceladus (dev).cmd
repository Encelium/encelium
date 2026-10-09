@echo off
rem Double-click to start Enceladus in development mode.
rem Uses npm.cmd, so it works even when PowerShell blocks scripts.
cd /d "%~dp0"
where npm.cmd >nul 2>nul || (
  echo Node.js was not found. Install it, then open this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo First run: installing packages...
  call npm.cmd install || (pause & exit /b 1)
)
call npm.cmd run app
if errorlevel 1 pause
