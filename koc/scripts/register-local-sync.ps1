[CmdletBinding()]
param(
    [switch]$Install,
    [string]$ProjectPath = (Join-Path $PSScriptRoot '..'),
    [string]$TaskName = 'WutheringWaves-KOC-Lark-Sync',
    [string]$NodePath,
    [string]$GitPath
)

$ErrorActionPreference = 'Stop'
if (-not $Install) {
    throw '등록은 명시적으로 -Install을 지정해야 합니다. 인증 정보는 저장하지 않습니다.'
}

$projectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path
$publisherPath = Join-Path $projectRoot 'scripts\refresh-and-publish.mjs'
if (-not (Test-Path -LiteralPath $publisherPath -PathType Leaf)) { throw '게시 스크립트를 찾을 수 없습니다.' }
if (-not $NodePath) { $NodePath = (Get-Command node.exe -ErrorAction Stop).Source }
if (-not $GitPath) { $GitPath = (Get-Command git.exe -ErrorAction Stop).Source }
$NodePath = (Resolve-Path -LiteralPath $NodePath).Path
$GitPath = (Resolve-Path -LiteralPath $GitPath).Path
$powershellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Quoted literals are encoded as a command solely to keep paths with spaces safe.
# No token, password, cookie or credential is included in the task definition.
function ConvertTo-PowerShellLiteral([string]$Value) { return "'" + $Value.Replace("'", "''") + "'" }
$nodeLiteral = ConvertTo-PowerShellLiteral $NodePath
$gitLiteral = ConvertTo-PowerShellLiteral $GitPath
$publisherLiteral = ConvertTo-PowerShellLiteral $publisherPath
$taskCode = "`$env:KOC_GIT_PATH = $gitLiteral`r`n& $nodeLiteral $publisherLiteral`r`nexit `$LASTEXITCODE"
$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($taskCode))
$arguments = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ' + $encodedCommand
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument $arguments -WorkingDirectory $projectRoot
$schedule = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddHours(6)) -RepetitionInterval (New-TimeSpan -Hours 6)
$logon = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$task = New-ScheduledTask -Action $action -Trigger @($schedule, $logon) -Principal $principal -Settings $settings -Description '현재 Windows 사용자의 Lark 인증으로 KOC 원본을 읽어 6시간마다 데이터만 게시합니다. PC가 켜져 있고 사용자가 로그인한 동안 실행됩니다.'
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
$registered = Get-ScheduledTask -TaskName $TaskName
$info = Get-ScheduledTaskInfo -TaskName $TaskName
[PSCustomObject]@{
    TaskName = $registered.TaskName
    State = $registered.State
    User = $identity
    ProjectPath = $projectRoot
    NodePath = $NodePath
    NextRunTime = $info.NextRunTime
    Interval = 'Every 6 hours and at user logon'
    LogPath = (Join-Path $projectRoot 'tmp\sync-status.json')
} | ConvertTo-Json -Depth 3
