@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_FINAL.ps1"
if errorlevel 1 (
  echo.
  echo FINAL PIPELINE FAILED. Keep this window open and copy the error output.
  pause
  exit /b 1
)
echo.
echo FINAL PIPELINE COMPLETED SUCCESSFULLY.
pause
