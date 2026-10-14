@echo off
cd /d "%~dp0"
python serve_ui.py --open
if errorlevel 1 pause
