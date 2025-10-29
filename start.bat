@echo off
echo ========================================
echo AI Document Search - Starting System
echo ========================================
echo.

:: Check if Ollama is installed
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Ollama not found!
    echo Please install Ollama from: https://ollama.ai/download
    pause
    exit /b 1
)

:: Check if Ollama is running and Mistral is available
echo Checking Ollama...
ollama list | findstr "mistral" >nul
if %ERRORLEVEL% NEQ 0 (
    echo Mistral model not found. Pulling now...
    echo This may take a few minutes...
    ollama pull mistral
)

:: Create data directories
echo Creating data directories...
if not exist "data\uploads" mkdir data\uploads
if not exist "data\embeddings" mkdir data\embeddings
if not exist "data\processed" mkdir data\processed

:: Check if venv exists
if not exist "src\backend\venv" (
    echo Creating Python virtual environment...
    cd src\backend
    python -m venv venv
    cd ..\..
)

:: Check if .env exists
if not exist ".env" (
    echo Creating .env file from example...
    copy .env.example .env
)

:: Install backend dependencies
echo Installing backend dependencies...
cd src\backend
call venv\Scripts\activate
pip install -q -r requirements.txt
cd ..\..

:: Check if frontend node_modules exists
if not exist "src\frontend\node_modules" (
    echo Installing frontend dependencies...
    cd src\frontend
    call npm install
    cd ..\..
)

echo.
echo ========================================
echo Starting Backend (FastAPI)...
echo ========================================
start cmd /k "cd src\backend && venv\Scripts\activate && python main.py"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Starting Frontend (Svelte)...
echo ========================================
start cmd /k "cd src\frontend && npm run dev"

echo.
echo ========================================
echo System Started Successfully!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to stop all services...
pause >nul

:: Kill the processes
taskkill /F /FI "WINDOWTITLE eq *backend*" >nul 2>nul
taskkill /F /FI "WINDOWTITLE eq *frontend*" >nul 2>nul

echo Services stopped.
pause
