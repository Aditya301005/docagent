param(
    [switch]$Launch
)

$ErrorActionPreference = "Stop"

$processNames = @(
    "Docker Desktop",
    "com.docker.backend",
    "com.docker.admin",
    "com.docker.build",
    "com.docker.proxy",
    "vpnkit",
    "dockerd"
)

$dockerDesktopExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

function Stop-DockerProcesses {
    Write-Host "Stopping Docker Desktop Service if present..."
    Stop-Service -Name "com.docker.service" -ErrorAction SilentlyContinue

    Write-Host "Stopping Docker-related processes..."
    foreach ($name in $processNames) {
        Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 2

    $remaining = Get-CimInstance Win32_Process | Where-Object {
        $_.Name -in @(
            "Docker Desktop.exe",
            "com.docker.backend.exe",
            "com.docker.admin.exe",
            "com.docker.build.exe",
            "com.docker.proxy.exe",
            "vpnkit.exe",
            "dockerd.exe"
        )
    }

    if ($remaining) {
        Write-Host "Some Docker processes survived the first pass. Using taskkill..."
        foreach ($proc in $remaining) {
            taskkill /PID $proc.ProcessId /T /F | Out-Null
        }
    }
}

function Wait-ForDockerExit {
    for ($attempt = 1; $attempt -le 10; $attempt++) {
        $remaining = Get-CimInstance Win32_Process | Where-Object {
            $_.Name -in @(
                "Docker Desktop.exe",
                "com.docker.backend.exe",
                "com.docker.admin.exe",
                "com.docker.build.exe",
                "com.docker.proxy.exe",
                "vpnkit.exe",
                "dockerd.exe"
            )
        }

        if (-not $remaining) {
            Write-Host "All Docker-related processes are gone."
            return
        }

        Start-Sleep -Seconds 1
    }

    $remainingSummary = Get-CimInstance Win32_Process | Where-Object {
        $_.Name -in @(
            "Docker Desktop.exe",
            "com.docker.backend.exe",
            "com.docker.admin.exe",
            "com.docker.build.exe",
            "com.docker.proxy.exe",
            "vpnkit.exe",
            "dockerd.exe"
        )
    } | Select-Object ProcessId, Name

    throw "Docker processes are still running:`n$($remainingSummary | Out-String)"
}

Write-Host "Checking for stuck Docker Desktop state..."
Stop-DockerProcesses

Write-Host "Shutting down WSL to clear Docker's Linux backend..."
wsl --shutdown

Wait-ForDockerExit

Write-Host ""
Write-Host "Cleanup complete."

if ($Launch) {
    if (-not (Test-Path $dockerDesktopExe)) {
        throw "Docker Desktop executable not found at: $dockerDesktopExe"
    }

    Write-Host "Launching Docker Desktop..."
    Start-Process -FilePath $dockerDesktopExe
    Write-Host "Docker Desktop launch requested."
} else {
    Write-Host "Now launch Docker Desktop again from the Start Menu."
}

Write-Host ""
Write-Host "Tip: if Docker is acting up, use this script before reopening it."
