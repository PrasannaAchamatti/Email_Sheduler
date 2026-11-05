@echo off
title ReachInbox Launcher
echo =======================================================
echo          Starting ReachInbox Services on Windows
echo =======================================================

echo [1/3] Starting Redis Server on port 6379...
start "ReachInbox - Redis Server (6379)" "%LOCALAPPDATA%\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\redis-server.exe"

timeout /t 2 >nul

echo [2/3] Starting ReachInbox Backend API on port 5000...
start "ReachInbox - Backend API (5000)" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 >nul

echo [3/3] Starting ReachInbox Frontend on port 5173...
start "ReachInbox - Frontend (5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo =======================================================
echo All services launched!
echo Frontend:    http://localhost:5173
echo Backend API: http://localhost:5000/api
echo Queue Board: http://localhost:5000/admin/queues
echo =======================================================

start http://localhost:5173
pause

