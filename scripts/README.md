# Utility Scripts

## `restart-docker-desktop.ps1`

Use this when Docker Desktop refuses to reopen because old `Docker Desktop.exe` processes are still running.

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\restart-docker-desktop.ps1"
```

To clean up and immediately relaunch Docker Desktop:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\restart-docker-desktop.ps1" -Launch
```

What it does:

1. Stops the Docker Desktop service if it exists
2. Force-stops leftover Docker frontend and backend processes
3. Uses `taskkill` if a normal stop does not finish the job
4. Runs `wsl --shutdown`
5. Optionally relaunches Docker Desktop with `-Launch`
