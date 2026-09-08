@echo off
cd /d "%~dp0..\backend"
call venv\Scripts\activate.bat
echo Re-seeding demo university data (this will reset the local database)...
python -m app.seed.seed_data
pause
