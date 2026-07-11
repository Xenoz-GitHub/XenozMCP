@echo off
setlocal
chcp 65001 >nul
title XenozMCP — Roblox Studio AI Bridge

cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════════╗
echo   ║         XenozMCP v0.1.0             ║
echo   ║   Roblox Studio MCP Bridge          ║
echo   ╚══════════════════════════════════════╝
echo.

REM --- Find Node.js ---
set "NODE="
where node >nul 2>nul
if not errorlevel 1 ( set "NODE=node" ) else (
    echo   ERROR: Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

REM --- Install dependencies (if needed) ---
if not exist "node_modules" (
    echo   [1/2] Installing dependencies (first time only)...
    call %NODE% npm install --silent
    if errorlevel 1 ( echo   ERROR: npm install failed & pause & exit /b 1 )
) else ( echo   [1/2] Dependencies ready )

REM --- Build TypeScript (if needed) ---
if not exist "dist\index.ts" if not exist "dist\index.js" (
    echo   [2/2] Building TypeScript...
    call %NODE% npx tsc
    if errorlevel 1 ( echo   ERROR: Build failed & pause & exit /b 1 )
) else ( echo   [2/2] Build ready )

echo.
echo   ✅ XenozMCP is starting
echo   🌐 Extension port: ws://127.0.0.1:17613
echo   🔐 Vault: AES-256-GCM
echo.
echo   Keep this window open while using XenozMCP.
echo.
%NODE% dist/index.js

echo.
echo   XenozMCP stopped.
pause >nul
exit /b 0
