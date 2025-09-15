@echo off
echo Restarting VS Code TypeScript Server...

REM Kill all VS Code processes
taskkill /f /im Code.exe 2>nul

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Clear TypeScript cache
if exist "%APPDATA%\Code\User\workspaceStorage" (
    echo Clearing TypeScript cache...
    rmdir /s /q "%APPDATA%\Code\User\workspaceStorage" 2>nul
)

REM Clear Next.js cache
if exist ".next" (
    echo Clearing Next.js cache...
    rmdir /s /q ".next" 2>nul
)

REM Clear TypeScript build info
if exist "tsconfig.tsbuildinfo" (
    echo Clearing TypeScript build info...
    del "tsconfig.tsbuildinfo" 2>nul
)

echo Done! You can now restart VS Code.
pause
