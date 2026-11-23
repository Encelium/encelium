@echo off
rem One-time setup: install GitHub's command-line tool and sign in to your GitHub account.
rem Double-click this file and follow the black window. The sign-in itself happens in your browser.
setlocal
set "GH=%ProgramFiles%\GitHub CLI\gh.exe"
set "GHUSER=%LOCALAPPDATA%\Programs\GitHub CLI\gh.exe"
if exist "%GH%" goto login
if exist "%GHUSER%" set "GH=%GHUSER%" & goto login
echo.
echo GitHub's command-line tool is not installed yet. Installing it now...
echo Windows may ask for permission. Click Yes.
echo.
winget install --id GitHub.cli --source winget --accept-package-agreements --accept-source-agreements
if exist "%GH%" goto login
if exist "%GHUSER%" set "GH=%GHUSER%" & goto login
goto failed

:login
echo.
echo A short code appears below. Keep this window open.
echo Press Enter. Then sign in to GitHub in your browser and type that code on the page.
echo If this window asks a question, press Enter.
echo.
"%GH%" auth login --hostname github.com --git-protocol https --web
if errorlevel 1 goto failed
echo.
echo Done. GitHub is connected. You can close this window.
pause
exit /b 0

:failed
echo.
echo It did not finish. Take a screenshot of this window and send it to your assistant.
pause
exit /b 1
