@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 scripts\serve-system-docs.py --open
) else (
  python scripts\serve-system-docs.py --open
)
pause
