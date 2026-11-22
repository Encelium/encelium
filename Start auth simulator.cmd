@echo off
rem Starts the local Encelus auth simulator and opens its admin panel in your browser.
rem The panel manages every handle: quotas, tiers, forced login, keys.
cd /d "%~dp0services\auth-sim"
where python >nul 2>nul || (
  set "PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else (
  set "PY=python"
)
if not exist "%PY%" (
  echo Python was not found. Install Python 3.12, then open this file again.
  pause
  exit /b 1
)
start "" http://127.0.0.1:8790/admin
"%PY%" -u server.py
if errorlevel 1 pause
