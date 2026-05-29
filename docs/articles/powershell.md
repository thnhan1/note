# PowerShell cho AEM AMS Dev

Các tính năng và lệnh PowerShell hữu ích khi làm việc với AEM 6.5 trên Windows.

---

## Setup PowerShell 7+

PowerShell 7 (pwsh) tốt hơn Windows PowerShell 5.1 về performance, syntax, cross-platform.

```powershell
winget install Microsoft.PowerShell
```

Set làm default trong Windows Terminal: Settings → Default profile → PowerShell.

---

## 1. Profile Customization

Mở profile:
```powershell
notepad $PROFILE
# Hoặc
code $PROFILE
```

Profile path mặc định:
```
C:\Users\<user>\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

Ví dụ profile cho AEM dev:

```powershell
# AEM Quick Commands
function aem-author { Start-Process "http://localhost:4502" }
function aem-publish { Start-Process "http://localhost:4503" }
function aem-crxde { Start-Process "http://localhost:4502/crx/de" }
function aem-osgi { Start-Process "http://localhost:4502/system/console/configMgr" }

# Maven shortcuts
function mci { mvn clean install $args }
function mcib { mvn clean install -PautoInstallBundle $args }
function mcip { mvn clean install -PautoInstallPackage $args }

# Tail AEM log
function aem-log {
    param([string]$file = "error.log")
    Get-Content "$env:AEM_HOME\crx-quickstart\logs\$file" -Tail 50 -Wait
}

# Set AEM home
$env:AEM_HOME = "C:\aem\author"
```

Reload profile:
```powershell
. $PROFILE
```

---

## 2. Tail Log File (như `tail -f`)

```powershell
Get-Content error.log -Tail 50 -Wait
```

Filter realtime:
```powershell
Get-Content error.log -Tail 100 -Wait | Where-Object { $_ -match "ERROR|Exception" }
```

Highlight keyword với màu:
```powershell
Get-Content error.log -Wait | ForEach-Object {
    if ($_ -match "ERROR") { Write-Host $_ -ForegroundColor Red }
    elseif ($_ -match "WARN") { Write-Host $_ -ForegroundColor Yellow }
    else { Write-Host $_ }
}
```

---

## 3. Search trong Files (như `grep`)

```powershell
# Search 1 string trong tất cả .java files
Get-ChildItem -Recurse -Filter *.java | Select-String "sling:resourceType"

# Short alias
gci -r -Filter *.xml | sls "mysite/components"

# Case-sensitive
sls "ResourceResolver" -CaseSensitive *.java

# Show context lines
sls "Exception" error.log -Context 2,3
```

---

## 4. AEM REST API với Invoke-RestMethod

### Get page JSON
```powershell
$cred = Get-Credential admin
Invoke-RestMethod -Uri "http://localhost:4502/content/mysite/en/home.infinity.json" `
                  -Credential $cred
```

### Query Builder
```powershell
$query = @{
    path = "/content/mysite"
    type = "cq:Page"
    "p.limit" = 10
}
Invoke-RestMethod -Uri "http://localhost:4502/bin/querybuilder.json" `
                  -Body $query -Credential $cred
```

### Trigger Replication
```powershell
$body = @{
    cmd = "Activate"
    path = "/content/mysite/en/home"
}
Invoke-RestMethod -Uri "http://localhost:4502/bin/replicate.json" `
                  -Method Post -Body $body -Credential $cred
```

### Upload package
```powershell
$form = @{
    file = Get-Item "mypackage.zip"
    name = "mypackage"
    force = "true"
    install = "true"
}
Invoke-RestMethod -Uri "http://localhost:4502/crx/packmgr/service.jsp" `
                  -Method Post -Form $form -Credential $cred
```

---

## 5. Process Management

### Tìm AEM process
```powershell
Get-Process java | Where-Object { $_.MainWindowTitle -match "aem" -or $_.Path -match "aem" }
```

### Tìm process đang chiếm port 4502
```powershell
Get-NetTCPConnection -LocalPort 4502 | Select-Object OwningProcess
Get-Process -Id (Get-NetTCPConnection -LocalPort 4502).OwningProcess
```

### Kill process theo port
```powershell
$pid = (Get-NetTCPConnection -LocalPort 4502 -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

---

## 6. Start AEM với Background Job

```powershell
function Start-AemAuthor {
    $job = Start-Job -ScriptBlock {
        Set-Location "C:\aem\author"
        java "-Xmx4g" "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005" `
             -jar "aem-author-p4502.jar" -nointeractive
    }
    Write-Host "AEM Author started, job ID: $($job.Id)"
    return $job
}

# Stop
Get-Job | Stop-Job
Get-Job | Remove-Job
```

---

## 7. File & Folder Operations

### Tìm file lớn nhất trong logs
```powershell
Get-ChildItem -Path "crx-quickstart\logs" -File |
    Sort-Object Length -Descending |
    Select-Object -First 10 Name, @{N='Size(MB)'; E={[math]::Round($_.Length/1MB, 2)}}
```

### Backup folder với timestamp
```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Compress-Archive -Path "crx-quickstart\repository" `
                 -DestinationPath "backup-repository-$timestamp.zip"
```

### Clean cache folders
```powershell
Remove-Item "crx-quickstart\launchpad\felix" -Recurse -Force
Remove-Item "crx-quickstart\launchpad\cache" -Recurse -Force
```

---

## 8. Maven Build Helpers

### Build chỉ module thay đổi
```powershell
function Build-AemChangedModules {
    $changed = git diff --name-only HEAD~1 |
        ForEach-Object { ($_ -split '/')[0] } |
        Sort-Object -Unique |
        Where-Object { Test-Path "$_/pom.xml" }
    
    if ($changed) {
        $modules = $changed -join ","
        mvn clean install -pl $modules -am -PautoInstallBundle
    }
}
```

### Watch và auto-deploy on file change
```powershell
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "core\src\main\java"
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*.java"

Register-ObjectEvent $watcher "Changed" -Action {
    Write-Host "Change detected, deploying..." -ForegroundColor Cyan
    Set-Location $using:PWD
    mvn install -PautoInstallBundle -pl core -am -q
}

$watcher.EnableRaisingEvents = $true
```

---

## 9. JSON Parsing

```powershell
# Parse Sling Model JSON response
$data = Invoke-RestMethod "http://localhost:4502/content/mysite/en/home.model.json" -Credential $cred

# Truy cập property
$data.':items'.root.':items'.container

# Convert sang JSON string
$data | ConvertTo-Json -Depth 10 | Out-File "page-data.json"

# Read JSON file
$config = Get-Content "config.json" | ConvertFrom-Json
```

---

## 10. CSV Export Logs

Parse và analyze access log:

```powershell
$logs = Get-Content "access.log" | ForEach-Object {
    if ($_ -match '^(\S+) - (\S+) \[([^\]]+)\] "(\S+) (\S+) [^"]+" (\d+) (\d+)') {
        [PSCustomObject]@{
            IP = $Matches[1]
            User = $Matches[2]
            Time = $Matches[3]
            Method = $Matches[4]
            Path = $Matches[5]
            Status = $Matches[6]
            Size = [int]$Matches[7]
        }
    }
}

# Top 10 slowest pages
$logs | Group-Object Path |
    Sort-Object Count -Descending |
    Select-Object -First 10 |
    Export-Csv "top-paths.csv" -NoTypeInformation
```

---

## 11. Environment Variables

```powershell
# Set permanent (User scope)
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\jdk-11", "User")
[Environment]::SetEnvironmentVariable("AEM_HOME", "C:\aem\author", "User")

# Set session-only
$env:JAVA_HOME = "C:\jdk-11"

# View all
Get-ChildItem env:
```

---

## 12. Aliases hữu ích

```powershell
Set-Alias -Name ll -Value Get-ChildItem
Set-Alias -Name grep -Value Select-String
Set-Alias -Name which -Value Get-Command
Set-Alias -Name touch -Value New-Item

# Dùng:
ll
which mvn
grep "ERROR" error.log
```

---

## 13. PSReadLine — Better Console Experience

PSReadLine có sẵn trong PS 7. Cấu hình trong profile:

```powershell
# History-based prediction (như fish shell)
Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -PredictionViewStyle ListView

# Auto-complete với Tab
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete

# Search history với Ctrl+R
Set-PSReadLineKeyHandler -Key Ctrl+r -Function ReverseSearchHistory
```

---

## 14. Modules hữu ích

```powershell
# Install module
Install-Module -Name posh-git           # Git status trong prompt
Install-Module -Name oh-my-posh         # Beautiful prompt themes
Install-Module -Name PSScriptAnalyzer   # Linting
Install-Module -Name ImportExcel        # Đọc/ghi Excel không cần Excel installed
```

### Setup Oh My Posh
```powershell
Install-Module oh-my-posh -Scope CurrentUser
# Trong $PROFILE
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\jandedobbeleer.omp.json" | Invoke-Expression
```

---

## 15. Useful AEM Functions Library

```powershell
function Test-AemRunning {
    param([int]$Port = 4502)
    try {
        $r = Invoke-WebRequest "http://localhost:$Port/libs/granite/core/content/login.html" -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200
    } catch { return $false }
}

function Get-AemBundles {
    $cred = Get-Credential admin
    $r = Invoke-RestMethod "http://localhost:4502/system/console/bundles.json" -Credential $cred
    $r.data | Where-Object { $_.symbolicName -match "mysite" } |
        Select-Object id, symbolicName, version, state
}

function Restart-AemBundle {
    param([string]$BundleName)
    $cred = Get-Credential admin
    Invoke-RestMethod -Uri "http://localhost:4502/system/console/bundles/$BundleName" `
                      -Method Post -Body @{action="restart"} -Credential $cred
}

function Clear-AemDispatcherCache {
    param([string]$Path = "/content/mysite")
    Remove-Item "C:\dispatcher-cache$($Path -replace '/','\')" -Recurse -Force
}
```

---

## Tổng kết

PowerShell mạnh hơn cmd nhiều cho AEM dev:
- Object pipeline → xử lý dữ liệu structured
- REST API native với `Invoke-RestMethod`
- Background jobs cho long-running tasks
- Profile + functions cho automation hằng ngày
- File watcher cho auto-deploy

Đầu tư 1-2 giờ build profile/scripts → tiết kiệm hàng giờ mỗi tuần.
