# Builds a fully self-contained ShopStock bundle for a locked-down PC:
# app code + node_modules + the node.exe runtime itself. The target machine
# needs NO installs, NO npm, NO internet - unzip and double-click start.cmd.
#
# Run on any Windows x64 machine where the app already works:
#   powershell -ExecutionPolicy Bypass -File scripts\make-portable.ps1
# Output: shopstock-portable.zip next to the project folder.

param(
    [string]$Out = ''
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\.."
if (-not $Out) { $Out = Join-Path (Split-Path $root) 'shopstock-portable.zip' }
$stage = Join-Path $env:TEMP "shopstock-portable-stage"

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    throw "node_modules not found - run 'npm install' in $root first."
}

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force $stage | Out-Null

Write-Host "Staging app files..."
$include = @('server.js', 'package.json', 'package-lock.json', 'config.example.json',
             'README.md', 'src', 'public', 'scripts', 'docs', 'node_modules')
foreach ($item in $include) {
    $src = Join-Path $root $item
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $stage $item) -Recurse
    }
}

# These assume Node on PATH / a dev machine - the bundle replaces them with
# start.cmd, and shipping them would just be a silent-failure trap.
Remove-Item (Join-Path $stage 'scripts\start-shopstock.cmd') -ErrorAction SilentlyContinue
Remove-Item (Join-Path $stage 'scripts\make-portable.ps1') -ErrorAction SilentlyContinue

Write-Host "Bundling Node runtime..."
# Ask Node for its real binary path - (Get-Command node).Source can resolve to
# a version-manager shim script, which is not a runnable exe.
$nodeExe = (& node -p "process.execPath").Trim()
if (-not ($nodeExe -like '*.exe')) { throw "Could not resolve the real node.exe (got: $nodeExe)" }
Copy-Item $nodeExe (Join-Path $stage 'node.exe')
$nodeVersion = & $nodeExe --version
Set-Content (Join-Path $stage 'NODE_VERSION.txt') "Bundled Node $nodeVersion (win-x64)"

# cmd.exe needs CRLF line endings; this .ps1 may be checked out with LF
function Write-CmdFile($path, $content) {
    $crlf = ($content -replace "`r`n", "`n") -replace "`n", "`r`n"
    Set-Content -Path $path -Value $crlf -Encoding ascii -NoNewline
}

# Launcher that uses the bundled runtime - works with no Node installed at all
Write-CmdFile (Join-Path $stage 'start.cmd') @'
@echo off
rem ShopStock portable launcher - no installation required.
rem To auto-start at login: put a shortcut to this file in shell:startup.
cd /d "%~dp0"

rem Read the configured port from config.json (default 8340)
set PORT=
"%~dp0node.exe" -p "require('./src/config').load().port" > "%TEMP%\shopstock-port.txt" 2>nul
set /p PORT=<"%TEMP%\shopstock-port.txt"
del "%TEMP%\shopstock-port.txt" >nul 2>&1
if "%PORT%"=="" set PORT=8340

netstat -an | findstr /C:":%PORT% " | findstr LISTENING >nul 2>&1
if %errorlevel%==0 (
  start "" http://localhost:%PORT%
  exit /b 0
)

start "ShopStock server" /min cmd /c ""%~dp0node.exe" server.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:%PORT%
'@

Set-Content (Join-Path $stage 'README-PORTABLE.txt') @'
ShopStock portable bundle
=========================
1. Unzip this folder anywhere you have write access (C:\shopstock, a user
   folder, etc.). No installs, no admin rights, no internet needed.
2. Double-click start.cmd  ->  the app opens at http://localhost:8340
3. Optional demo data (empty database only): double-click seed-demo.cmd
4. Auto-start at login: Win+R -> shell:startup -> put a shortcut to start.cmd there.

Ignore the Quick start section in README.md - it describes the git/npm
developer setup. This bundle is self-contained; start.cmd is all you need.
Your inventory lives in the data\ subfolder - back that folder up.

Upgrading from an older version (keeps ALL your data)
-----------------------------------------------------
Everything you have built (locations, sub-locations, items, quantities,
checkouts, history, photos) lives in the data\ subfolder, and settings in
config.json. Neither is inside this zip, so upgrading never touches them.

1. Close the ShopStock server window first (or reboot) so the database
   is not mid-write.
2. EITHER unzip the new version straight over your existing folder,
   replacing files when asked - data\ and config.json are not in the zip,
   so they are left alone.
   OR unzip to a new folder, then MOVE the old install's data\ folder
   (and config.json, if you made one) into the new folder before starting.
3. Copy or move the data\ folder as a whole - shopstock.db together with
   any shopstock.db-wal / -shm files and the photos\ subfolder. Never copy
   the .db file by itself; recent changes live in the -wal file.
4. Double-click start.cmd. Any database updates a new version needs are
   applied automatically on first start.
'@

Write-CmdFile (Join-Path $stage 'seed-demo.cmd') @'
@echo off
rem Loads demo data into an empty database (for trying the app out).
cd /d "%~dp0"
"%~dp0node.exe" scripts\seed-demo.js
pause
'@

Write-Host "Zipping to $Out ..."
if (Test-Path $Out) { Remove-Item -Force $Out }
Compress-Archive -Path "$stage\*" -DestinationPath $Out
Remove-Item -Recurse -Force $stage

$size = [math]::Round((Get-Item $Out).Length / 1MB, 1)
Write-Host ""
Write-Host "Done: $Out ($size MB)"
Write-Host "On the target PC: unzip anywhere (e.g. C:\shopstock or even a user folder),"
Write-Host "double-click start.cmd. Data lives in the data\ subfolder it creates."
