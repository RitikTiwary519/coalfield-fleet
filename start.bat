@echo off
echo 🚛 Coalfield Fleet - Local Development Setup
echo =================================================

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or later.
    pause
    exit /b 1
)

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📦 pnpm not found. Installing pnpm...
    npm install -g pnpm
)

echo 📦 Installing dependencies...
pnpm install

echo 🏗️ Building the application...
pnpm run build

echo 🚀 Starting development server...
echo    • Web Dashboard: http://localhost:3000
echo    • WebSocket Server: ws://localhost:8080
echo    • Mobile Truck Registration: http://localhost:3000 (on mobile device)
echo.
echo ✨ Ready for live truck tracking!

pnpm run dev