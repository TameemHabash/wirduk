# Helpers for checking the app on the emulator or a phone (PowerShell 5.1).
#
#   . .\scripts\dev\emulator.ps1          # load the functions (dot-source)
#   Open-App                              # dev build, connected to Metro on :8081
#   Open-Link 'wirduk://category/133?dhikr=133006'
#   Show-Ui                               # what is on screen (text, label, bounds)
#   Tap-Ui 'إتمام هذا الذكر والانتقال إلى التالي'
#   Save-Shot 'reader'                    # screenshot to .local/shots/reader.png
#
# Tap by on-screen text or accessibility label (uiautomator), not by guessed
# coordinates. Set $env:ADB_SERIAL to pick a device when several are connected.

$script:adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$script:shots = Join-Path $PSScriptRoot '..\..\.local\shots'
New-Item -ItemType Directory -Force $script:shots | Out-Null

function Invoke-Adb {
  if ($env:ADB_SERIAL) { & $script:adb -s $env:ADB_SERIAL @args } else { & $script:adb @args }
}

function Open-App {
  Invoke-Adb reverse tcp:8081 tcp:8081 | Out-Null
  Invoke-Adb shell am force-stop com.wirduk.app
  Invoke-Adb shell am start -a android.intent.action.VIEW `
    -d 'exp+wirduk://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081' com.wirduk.app | Out-Null
}

# Deep links: wirduk://category/<id>[?dhikr=<dhikrId>], wirduk://custom, wirduk://custom/<-id>,
# wirduk://custom/<-id>/dhikr/new, wirduk://settings, wirduk://search, wirduk://audio, wirduk://about
function Open-Link([string]$url) {
  Invoke-Adb shell am start -a android.intent.action.VIEW -d "'$url'" com.wirduk.app 2>&1 | Out-Null
  Start-Sleep -Seconds 2
}

function Get-UiNodes {
  Invoke-Adb shell uiautomator dump /data/local/tmp/ui.xml | Out-Null
  $file = Join-Path $script:shots 'ui.xml'
  Invoke-Adb pull /data/local/tmp/ui.xml $file 2>&1 | Out-Null
  ([xml](Get-Content $file -Raw -Encoding utf8)).SelectNodes('//node')
}

function Show-Ui {
  Get-UiNodes | Where-Object { $_.text -or $_.'content-desc' } |
    ForEach-Object { "$($_.text) | $($_.'content-desc') | $($_.class.Split('.')[-1]) $($_.bounds)" }
}

function Tap-Ui([string]$text, [int]$waitMs = 1200) {
  # A control with this accessibility label (a switch, a button) wins over plain text with the
  # same words: a settings row's label is not tappable, its switch is.
  $n = Get-UiNodes | Where-Object { $_.text -eq $text -or $_.'content-desc' -eq $text } |
    Sort-Object { if ($_.'content-desc' -eq $text) { 0 } else { 1 } } | Select-Object -First 1
  if (-not $n) { throw "Not on screen: $text" }
  if ($n.bounds -notmatch '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') { throw "Bad bounds: $($n.bounds)" }
  $x = [int](([int]$matches[1] + [int]$matches[3]) / 2)
  $y = [int](([int]$matches[2] + [int]$matches[4]) / 2)
  Invoke-Adb shell input tap $x $y
  Start-Sleep -Milliseconds $waitMs
}

function Save-Shot([string]$name) {
  Invoke-Adb shell screencap -p /data/local/tmp/s.png
  $file = Join-Path $script:shots "$name.png"
  Invoke-Adb pull /data/local/tmp/s.png $file 2>&1 | Out-Null
  (Resolve-Path $file).Path
}

# Latin text only ("%s" = space). Plain "input text" once opened other apps' screens.
function Send-Text([string]$text) { Invoke-Adb shell input keyboard text ($text -replace ' ', '%s') }

# Copies the app's content database from the device (binary-safe; PowerShell ">" breaks binary data).
function Get-ContentDb([int]$version, [string]$to) {
  Invoke-Adb shell "run-as com.wirduk.app cat files/SQLite/content-v$version.db > /data/local/tmp/c.db"
  Invoke-Adb pull /data/local/tmp/c.db $to | Out-Null
}
