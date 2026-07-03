#!/usr/bin/env pwsh
# manage-plugin.example.ps1
# Legitflix Plugin Management Script template.
# Copy this file to "manage-plugin.ps1" and customize local paths.
#
# Usage:
#   .\manage-plugin.ps1 uninstall   - Removes the plugin and restarts Jellyfin
#   .\manage-plugin.ps1 disable     - Disables the plugin (renames DLL) and restarts Jellyfin
#   .\manage-plugin.ps1 enable      - Re-enables the plugin (restores DLL) and restarts Jellyfin
#   .\manage-plugin.ps1 status      - Shows current plugin status

param(
    [Parameter(Position=0)]
    [ValidateSet("uninstall", "disable", "enable", "status")]
    [string]$Action = "status"
)

# UPDATE these settings to match your environment
$ContainerName = "jellyfin"
$HostPluginPath = "C:\docker\jellyfin-config\data\plugins\Legitflix_1.0.0.0"

function Get-PluginStatus {
    if (-not (Test-Path $HostPluginPath)) {
        Write-Host "  Status: NOT INSTALLED" -ForegroundColor Yellow
        return "not_installed"
    }
    
    if (Test-Path "$HostPluginPath\LegitFlix.Plugin.dll") {
        Write-Host "  Status: INSTALLED & ENABLED" -ForegroundColor Green
        return "enabled"
    }
    
    if (Test-Path "$HostPluginPath\LegitFlix.Plugin.dll.disabled") {
        Write-Host "  Status: INSTALLED & DISABLED" -ForegroundColor DarkYellow
        return "disabled"
    }
    
    Write-Host "  Status: UNKNOWN (folder exists but no DLL found)" -ForegroundColor Red
    return "unknown"
}

Write-Host "`n  === Legitflix Plugin Manager ===" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    "status" {
        Write-Host "  Checking plugin status..." -ForegroundColor Gray
        Get-PluginStatus | Out-Null
    }
    
    "uninstall" {
        Write-Host "  Uninstalling Legitflix plugin..." -ForegroundColor Yellow
        $status = Get-PluginStatus
        if ($status -eq "not_installed") {
            Write-Host "  Plugin is not installed. Nothing to do." -ForegroundColor Gray
            return
        }
        
        Write-Host ""
        $confirm = Read-Host "  Are you sure you want to UNINSTALL Legitflix? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "  Cancelled." -ForegroundColor Gray
            return
        }
        
        # Stop Jellyfin first to release file locks
        Write-Host "`n  Stopping Jellyfin to release file locks..." -ForegroundColor Cyan
        docker stop $ContainerName
        Start-Sleep -Seconds 5
        
        # Remove the plugin directory from the host bind mount
        try {
            Remove-Item -Path $HostPluginPath -Recurse -Force
            Write-Host "  Plugin files removed successfully!" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to remove plugin files: $_" -ForegroundColor Red
            Write-Host "  Try running this script as Administrator." -ForegroundColor Yellow
        }
        
        # Start Jellyfin back up
        Write-Host "  Starting Jellyfin..." -ForegroundColor Cyan
        docker start $ContainerName
        Write-Host "  Done! Jellyfin is starting up without Legitflix." -ForegroundColor Green
        Write-Host "  Please wait ~15 seconds for the server to come back up." -ForegroundColor Gray
    }
    
    "disable" {
        Write-Host "  Disabling Legitflix plugin..." -ForegroundColor Yellow
        $status = Get-PluginStatus
        if ($status -eq "not_installed") {
            Write-Host "  Plugin is not installed. Nothing to do." -ForegroundColor Gray
            return
        }
        if ($status -eq "disabled") {
            Write-Host "  Plugin is already disabled." -ForegroundColor Gray
            return
        }
        
        # Stop Jellyfin, rename DLL, start
        Write-Host "`n  Stopping Jellyfin to release file locks..." -ForegroundColor Cyan
        docker stop $ContainerName
        Start-Sleep -Seconds 5
        
        try {
            Rename-Item -Path "$HostPluginPath\LegitFlix.Plugin.dll" -NewName "LegitFlix.Plugin.dll.disabled"
            Write-Host "  Plugin disabled successfully!" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to disable plugin: $_" -ForegroundColor Red
        }
        
        docker start $ContainerName
        Write-Host "  Jellyfin is starting without Legitflix loaded." -ForegroundColor Green
        Write-Host "  Please wait ~15 seconds for the server to come back up." -ForegroundColor Gray
    }
    
    "enable" {
        Write-Host "  Enabling Legitflix plugin..." -ForegroundColor Yellow
        $status = Get-PluginStatus
        if ($status -eq "not_installed") {
            Write-Host "  Plugin is not installed. Use run-dev.ps1 to deploy it." -ForegroundColor Gray
            return
        }
        if ($status -eq "enabled") {
            Write-Host "  Plugin is already enabled." -ForegroundColor Gray
            return
        }
        
        # Stop Jellyfin, restore DLL, start
        Write-Host "`n  Stopping Jellyfin to release file locks..." -ForegroundColor Cyan
        docker stop $ContainerName
        Start-Sleep -Seconds 5
        
        try {
            Rename-Item -Path "$HostPluginPath\LegitFlix.Plugin.dll.disabled" -NewName "LegitFlix.Plugin.dll"
            Write-Host "  Plugin enabled successfully!" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to enable plugin: $_" -ForegroundColor Red
        }
        
        docker start $ContainerName
        Write-Host "  Jellyfin is starting with Legitflix loaded." -ForegroundColor Green
        Write-Host "  Please wait ~15 seconds for the server to come back up." -ForegroundColor Gray
    }
}

Write-Host ""
