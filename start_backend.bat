@echo off
echo ======================================================
echo  AeroFuel Manager - Starting Backend (Flask)
echo ======================================================
cd /d "%~dp0backend"
echo.
echo Make sure PostgreSQL is running with database: aroplane_fuel
echo.
python app.py
pause
