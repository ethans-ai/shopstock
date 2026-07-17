@echo off
rem ShopStock launcher - double-click to start the server and open the app.
rem No admin rights needed. To auto-start at login, put a shortcut to this
rem file in shell:startup (Win+R, type shell:startup, Enter).

cd /d "%~dp0.."

rem Read the configured port (falls back to 8340 if node isn't resolvable yet)
rem ("call" matters: if node resolves to a version-manager .cmd shim, a bare
rem  invocation would chain into it and never come back to this script)
set PORT=
call node -p "require('./src/config').load().port" > "%TEMP%\shopstock-port.txt" 2>nul
set /p PORT=<"%TEMP%\shopstock-port.txt"
del "%TEMP%\shopstock-port.txt" >nul 2>&1
if "%PORT%"=="" set PORT=8340

rem If the server is already running, just open the browser
netstat -an | findstr /C:":%PORT% " | findstr LISTENING >nul 2>&1
if %errorlevel%==0 (
  start "" http://localhost:%PORT%
  exit /b 0
)

start "ShopStock server" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:%PORT%
