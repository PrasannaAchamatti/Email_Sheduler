@echo off
title ReachInbox Stop Services
echo Stopping ReachInbox services...

taskkill /F /IM redis-server.exe >nul 2>&1
echo Stopped Redis.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Stopped Backend (Port 5000).

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Stopped Frontend (Port 5173).

echo =======================================================
echo All ReachInbox processes stopped.
echo =======================================================
pause

