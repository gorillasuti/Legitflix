# run-dev.example.ps1
# Helper script to compile and deploy the Legitflix plugin locally for live testing.
# Copy this file to "run-dev.ps1" and update the paths below to match your environment.

$ErrorActionPreference = "Stop"

# 1. Compile React Client
Write-Host "Compiling React client..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\legitflix-client"
npm install # Ensure dependencies are installed
npm run build
Pop-Location

# 2. Compile C# Plugin
Write-Host "Compiling C# Plugin..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\LegitFlix.Plugin"
dotnet build -c Debug
Pop-Location

# 3. Deploy Plugin to local Jellyfin plugins folder
# UPDATE THIS PATH to point to your Jellyfin plugin folder (e.g. Docker host volume or local installation)
$pluginDest = "C:\docker\jellyfin-config\data\plugins\Legitflix_1.0.0.0"
Write-Host "Deploying plugin to $pluginDest..." -ForegroundColor Cyan

if (-not (Test-Path $pluginDest)) {
    New-Item -ItemType Directory -Force -Path $pluginDest | Out-Null
}

Copy-Item "$PSScriptRoot\LegitFlix.Plugin\bin\Debug\net9.0\LegitFlix.Plugin.dll" -Destination $pluginDest -Force
if (Test-Path "$PSScriptRoot\LegitFlix.Plugin\meta.json") {
    Copy-Item "$PSScriptRoot\LegitFlix.Plugin\meta.json" -Destination $pluginDest -Force
}

# 4. Restart Jellyfin Server
# UPDATE THIS COMMAND depending on how your Jellyfin server is run (Docker, Systemd service, or local process)
Write-Host "Restarting Jellyfin Docker Container..." -ForegroundColor Green
docker restart jellyfin

Write-Host "---------------------------------------------------"
Write-Host "Deployment complete! Jellyfin restarted." -ForegroundColor Green
Write-Host "---------------------------------------------------"
Write-Host "Tip: For rapid React development with HMR:"
Write-Host "1. Keep Jellyfin running."
Write-Host "2. In 'legitflix-client', run: npm run dev"
Write-Host "3. Open http://localhost:5173/LegitFlix/Client/ to test React changes instantly!"
Write-Host "---------------------------------------------------"
