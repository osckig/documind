@echo off
cls
echo ================================================
echo  AI Document Search - Quick Start
echo ================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.9+
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Please install Node.js 18+
    pause
    exit /b 1
)

:: Check Ollama
ollama list >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ollama not found! Please install Ollama
    echo Download from: https://ollama.ai/download
    pause
    exit /b 1
)

echo [OK] Python found
echo [OK] Node.js found
echo [OK] Ollama found
echo.

:: Create data directories
if not exist data\uploads mkdir data\uploads
if not exist data\embeddings mkdir data\embeddings
if not exist data\processed mkdir data\processed
echo [OK] Data directories ready
echo.

:: Setup backend
echo ================================================
echo  Setting up Backend...
echo ================================================
cd src\backend

if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        cd ..\..
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
echo (This may take a few minutes on first run...)
pip install -q --upgrade pip
pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    cd ..\..
    pause
    exit /b 1
)

echo [OK] Backend setup complete
cd ..\..
echo.

:: Setup frontend
echo ================================================
echo  Setting up Frontend...
echo ================================================
cd src\frontend

if not exist node_modules (
    echo Installing Node dependencies...
    echo (This may take a few minutes on first run...)
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install Node dependencies
        cd ..\..
        pause
        exit /b 1
    )
)

echo [OK] Frontend setup complete
cd ..\..
echo.

:: Start services
echo ================================================
echo  Starting Services...
echo ================================================
echo.
echo Starting Backend on http://localhost:8000
echo Starting Frontend on http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop services
echo.
pause

:: Start backend in new window
start "AI Search - Backend" cmd /k "cd /d "%CD%\src\backend" && venv\Scripts\activate && python main.py"

:: Wait a bit for backend to start
timeout /t 5 /nobreak >nul

:: Start frontend in new window
start "AI Search - Frontend" cmd /k "cd /d "%CD%\src\frontend" && npm run dev"

:: Wait for frontend to start
timeout /t 3 /nobreak >nul

echo.
echo ================================================
echo  System Started!
echo ================================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Opening browser...
start http://localhost:5173

echo.
echo ================================================
echo  To stop: Close the Backend and Frontend windows
echo ================================================
echo.
pause
