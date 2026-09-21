@echo off
setlocal
cd /d "%~dp0\.."

where python >nul 2>&1
if errorlevel 1 (
  echo Python was not found in PATH.
  pause
  exit /b 1
)

python -m pip install -r agent\requirements.txt
if errorlevel 1 (
  echo Failed to install agent dependencies.
  pause
  exit /b 1
)

echo.
echo Starting NetOps Command Center Agent...
echo Dashboard: http://127.0.0.1:8787
echo.
python agent\netops_agent.py
pause
