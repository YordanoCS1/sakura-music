@echo off
title Sakura Music
cd /d "%~dp0"
echo ==============================================
echo   Iniciando Sakura Music (Desktop Nativo)
echo ==============================================
echo.
npm run tauri dev
if %errorlevel% neq 0 (
    echo.
    echo Ocurrio un error al ejecutar Sakura Music.
    pause
)
