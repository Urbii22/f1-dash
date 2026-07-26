@echo off
REM One-click stopper: frees the ports used by the f1-dash services.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-all.ps1"
pause
