@echo off
REM One-click launcher for all f1-dash services (api + realtime + dashboard).
REM Double-click this file, or run it from a terminal. Pass-through flags work,
REM e.g.  start-f1-dash.bat -NoBrowser   or   start-f1-dash.bat -SkipBuild
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1" %*
if errorlevel 1 pause
