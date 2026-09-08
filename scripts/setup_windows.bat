@echo off
REM ============================================================
REM  UniVerse AI 2026 - One-time setup for Windows 11 (CPU-only)
REM  No Docker, no GPU required.
REM ============================================================

echo [1/5] Checking Python...
python --version || (echo Python 3.11+ is required. Install from https://python.org & exit /b 1)

echo [2/5] Creating backend virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate.bat

echo [3/5] Installing backend dependencies (CPU-only wheels)...
pip install --upgrade pip
pip install -r requirements.txt

echo [4/5] Training ML models and seeding demo university data...
python -m app.seed.seed_data

echo [5/5] Setting up frontend...
cd ..\frontend
where npm >nul 2>nul || (echo Node.js is required. Install from https://nodejs.org & exit /b 1)
npm install

echo.
echo ============================================================
echo  Setup complete!
echo  Run scripts\run_backend.bat  and  scripts\run_frontend.bat
echo  in two separate terminal windows to start the platform.
echo ============================================================
pause
