@echo off
setlocal
chcp 65001 >nul
title XenozMCP — Roblox Studio MCP Bridge

cd /d "%~dp0"

echo.
echo   === XenozMCP v0.1.0 ===
echo.

REM --- Find Node.js ---
echo   [1/3] Looking for Node.js...
set "NODE="
where node >nul 2>nul
if not errorlevel 1 (
    set "NODE=node"
    echo         Found: node
) else (
    echo         Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

REM --- Install dependencies ---
echo.
echo   [2/3] Installing dependencies...
call %NODE% npm install --silent
if errorlevel 1 (
    echo   ERROR: npm install failed
    pause
    exit /b 1
)
echo         OK

REM --- Build TypeScript ---
echo.
echo   [3/3] Building TypeScript...
call %NODE% npx tsc
if errorlevel 1 (
    echo   ERROR: TypeScript build failed
    pause
    exit /b 1
)
echo         OK

echo.
echo   XenozMCP is starting — keep this window open.
echo   Configure in config.json (set your Open Cloud API key).
echo.
call %NODE% dist/index.js

echo.
echo   XenozMCP stopped. Press any key to close.
pause >nul
exit /b 0
