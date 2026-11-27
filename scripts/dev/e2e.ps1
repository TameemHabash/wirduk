# End-to-end runs on the emulator with Maestro (PowerShell 5.1). Keep Arabic out of this file.
#
#   . .\scripts\dev\e2e.ps1                 # load the functions (dot-source)
#   Install-E2eApk                          # build (x86_64 release) and install
#   Invoke-E2e shots -Name baseline         # every screen -> .local/shots/baseline/
#   Invoke-E2e flows                        # the user flows with their checks
#
# The release build runs without Metro and without the dev "Tools" button. The emulator gets a
# fixed state first (clean app data, fixed date and clock, light theme, font 1.0), so two runs of
# the same code give the same pictures. Needs a google_apis emulator image (adb root).

$script:repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$script:app = 'com.wirduk.app'
# Thursday 2026-11-27, 09:00: a morning, inside the morning ward's window.
$script:defaultDate = '2026-11-27 09:00'

function Initialize-E2eEnv {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
    [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine')
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
  $env:MAESTRO_CLI_NO_ANALYTICS = '1'
  $env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = 'true'
}

function Invoke-E2eAdb { & $script:adb @args }

# Builds the release APK for the emulator (x86_64) and installs it over the current app.
function Install-E2eApk([switch]$NoBuild) {
  Initialize-E2eEnv
  if (-not $NoBuild) {
    Push-Location (Join-Path $script:repo 'android')
    try { .\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --console=plain -q }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed' }
  }
  $apk = Join-Path $script:repo 'android\app\build\outputs\apk\release\app-release.apk'
  Invoke-E2eAdb install -r $apk | Out-Null
}

# Sets the emulator's date and time (format 'yyyy-MM-dd HH:mm'). Needs adb root.
function Set-E2eDate([string]$date) {
  $d = [datetime]::ParseExact($date, 'yyyy-MM-dd HH:mm', $null)
  Invoke-E2eAdb shell settings put global auto_time 0 | Out-Null
  Invoke-E2eAdb shell date ($d.ToString('MMddHHmmyyyy') + '.00') | Out-Null
  Invoke-E2eAdb shell am broadcast -a com.android.systemui.demo -e command clock `
    -e hhmm $d.ToString('HHmm') | Out-Null
}

# The fixed state every run starts from.
function Reset-E2eDevice([string]$date = $script:defaultDate, [switch]$Dark, [double]$FontScale = 1.0) {
  Initialize-E2eEnv
  Invoke-E2eAdb root | Out-Null
  Invoke-E2eAdb wait-for-device
  Invoke-E2eAdb shell am force-stop $script:app
  Invoke-E2eAdb shell pm clear $script:app | Out-Null
  # pm clear keeps runtime permissions: never asked again, so the app asks as on a new phone.
  Invoke-E2eAdb shell pm revoke $script:app android.permission.POST_NOTIFICATIONS 2>$null | Out-Null
  Invoke-E2eAdb shell pm clear-permission-flags $script:app android.permission.POST_NOTIFICATIONS `
    user-set user-fixed 2>$null | Out-Null
  # A quiet, fixed status bar (System UI demo mode).
  Invoke-E2eAdb shell settings put global sysui_demo_allowed 1 | Out-Null
  $demo = 'com.android.systemui.demo'
  Invoke-E2eAdb shell am broadcast -a $demo -e command enter | Out-Null
  Invoke-E2eAdb shell am broadcast -a $demo -e command battery -e level 100 -e plugged false | Out-Null
  Invoke-E2eAdb shell am broadcast -a $demo -e command network -e wifi show -e level 4 | Out-Null
  Invoke-E2eAdb shell am broadcast -a $demo -e command network -e mobile hide | Out-Null
  Invoke-E2eAdb shell am broadcast -a $demo -e command notifications -e visible false | Out-Null
  Set-E2eDate $date
  Invoke-E2eAdb shell cmd uimode night ($(if ($Dark) { 'yes' } else { 'no' })) | Out-Null
  Invoke-E2eAdb shell settings put system font_scale ([string]$FontScale) | Out-Null
}

# Speed numbers, written to .local/perf-<Name>.txt. Run it after a shots run (the app has data):
# cold start (median of 5, ms) and the frames drawn while swiping 20 pages of the morning adhkar.
function Measure-E2ePerf([string]$Name = 'latest') {
  Initialize-E2eEnv
  $starts = foreach ($i in 1..5) {
    Invoke-E2eAdb shell am force-stop $script:app
    Start-Sleep -Seconds 2
    $o = Invoke-E2eAdb shell am start -W -n "$script:app/.MainActivity"
    [int](($o | Select-String 'TotalTime:\s*(\d+)').Matches[0].Groups[1].Value)
    Start-Sleep -Seconds 3
  }
  $median = ($starts | Sort-Object)[2]
  Invoke-E2eAdb shell am start -a android.intent.action.VIEW -d 'wirduk://category/1' $script:app | Out-Null
  Start-Sleep -Seconds 3
  Invoke-E2eAdb shell dumpsys gfxinfo $script:app reset | Out-Null
  foreach ($i in 1..10) { Invoke-E2eAdb shell input swipe 150 1300 950 1300 250; Start-Sleep -Milliseconds 700 }
  foreach ($i in 1..10) { Invoke-E2eAdb shell input swipe 950 1300 150 1300 250; Start-Sleep -Milliseconds 700 }
  $frames = Invoke-E2eAdb shell dumpsys gfxinfo $script:app |
    Select-String 'Total frames rendered|Janky frames:|50th percentile|90th percentile|99th percentile' |
    Select-Object -First 5 | ForEach-Object { $_.Line.Trim() }
  $text = @("cold start ms (5 runs): $($starts -join ', ') -> median $median", 'reader, 20 swipes:') + $frames
  $text | Out-File -Encoding utf8 (Join-Path $script:repo ".local\perf-$Name.txt")
  $text
}

# CPU time (ms) used so far by the app's JS thread and its main (UI) thread. /proc counts in
# ticks of 10 ms; the thread name sits in brackets and may hold spaces, so read after the ')'.
function Get-E2eAppCpu([int]$procId) {
  $lines = Invoke-E2eAdb shell "for t in /proc/$procId/task/*; do cat `$t/stat; done" 2>$null
  $js = 0; $ui = 0
  foreach ($line in $lines) {
    $open = $line.IndexOf('('); $close = $line.LastIndexOf(')')
    if ($open -lt 0 -or $close -lt 0) { continue }
    $name = $line.Substring($open + 1, $close - $open - 1)
    $f = $line.Substring($close + 2).Split(' ')
    # After the name: state(0) ... utime(11) stime(12).
    $ms = ([long]$f[11] + [long]$f[12]) * 10
    $tid = [int]$line.Substring(0, $open).Trim()
    if ($name -like 'mqt*js*') { $js += $ms }
    if ($tid -eq $procId) { $ui += $ms }
  }
  [pscustomobject]@{ Js = $js; Ui = $ui }
}

# The work some actions cost: the CPU time (ms) of the JS and UI threads in the seconds after
# each one. Per cold start: the adhkar tab's first visit (the screen is built) and a second
# one (shown again), then the morning adhkar opened from Home, then 10 counting taps. Median of
# $Runs cold starts, written to .local/perf-cpu-<Name>.txt. Run it after a shots run.
function Measure-E2eCpu([string]$Name = 'latest', [int]$Runs = 5) {
  Initialize-E2eEnv
  $results = foreach ($i in 1..$Runs) {
    Invoke-E2eAdb shell am force-stop $script:app
    Start-Sleep -Seconds 2
    Invoke-E2eAdb shell am start -W -n "$script:app/.MainActivity" | Out-Null
    Start-Sleep -Seconds 5
    # The tabs: the middle one is the adhkar tab; in RTL Home is the right one.
    Invoke-E2eAdb shell uiautomator dump /sdcard/ui.xml | Out-Null
    $xml = Invoke-E2eAdb shell cat /sdcard/ui.xml
    $m = [regex]::Match($xml, 'resource-id="tab-bar"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
    if (-not $m.Success) { throw 'No tab bar on screen' }
    $y = [int](([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2)
    $w = [int]$m.Groups[3].Value
    $procId = [int](Invoke-E2eAdb shell pidof $script:app)
    $cpu = @(Get-E2eAppCpu $procId)
    Invoke-E2eAdb shell input tap ([int]($w / 2)) $y          # adhkar tab, first visit
    Start-Sleep -Seconds 4
    $cpu += Get-E2eAppCpu $procId
    Invoke-E2eAdb shell input tap ([int]($w * 5 / 6)) $y      # Home
    Start-Sleep -Seconds 3
    $cpu += Get-E2eAppCpu $procId
    Invoke-E2eAdb shell input tap ([int]($w / 2)) $y          # adhkar tab again
    Start-Sleep -Seconds 4
    $cpu += Get-E2eAppCpu $procId
    Invoke-E2eAdb shell input tap ([int]($w * 5 / 6)) $y      # Home
    Start-Sleep -Seconds 3
    $cpu += Get-E2eAppCpu $procId
    Invoke-E2eAdb shell am start -a android.intent.action.VIEW -d 'wirduk://category/1' $script:app | Out-Null
    Start-Sleep -Seconds 4
    $cpu += Get-E2eAppCpu $procId
    foreach ($t in 1..10) { Invoke-E2eAdb shell input tap ([int]($w / 2)) 1300; Start-Sleep -Milliseconds 400 }
    Start-Sleep -Seconds 2
    $cpu += Get-E2eAppCpu $procId
    [pscustomobject]@{
      TabFirst = $cpu[1].Js - $cpu[0].Js; TabFirstUi = $cpu[1].Ui - $cpu[0].Ui
      TabAgain = $cpu[3].Js - $cpu[2].Js; TabAgainUi = $cpu[3].Ui - $cpu[2].Ui
      Reader = $cpu[5].Js - $cpu[4].Js; ReaderUi = $cpu[5].Ui - $cpu[4].Ui
      Taps = $cpu[6].Js - $cpu[5].Js; TapsUi = $cpu[6].Ui - $cpu[5].Ui
    }
  }
  $line = {
    param($label, $p)
    $js = $results | ForEach-Object { $_.$p }
    $ui = $results | ForEach-Object { $_."${p}Ui" }
    $mid = [int][math]::Floor($Runs / 2)
    "  ${label}: JS $($js -join ', ') -> median $(($js | Sort-Object)[$mid]);" +
    " UI $($ui -join ', ') -> median $(($ui | Sort-Object)[$mid])"
  }
  $text = @(
    "CPU ms per action ($Runs cold starts; JS thread / UI thread):",
    (& $line 'adhkar tab, first visit' 'TabFirst'),
    (& $line 'adhkar tab, again      ' 'TabAgain'),
    (& $line 'open the morning adhkar' 'Reader'),
    (& $line '10 counting taps       ' 'Taps')
  )
  $text | Out-File -Encoding utf8 (Join-Path $script:repo ".local\perf-cpu-$Name.txt")
  $text
}

# One tap at ($x, $y) with atrace running; scripts/dev/tap-trace.ts reads the trace.
function Invoke-E2eTracedTap([int]$x, [int]$y, [int]$procId, [int]$jsTid) {
  Invoke-E2eAdb shell atrace --async_start -b 32768 sched gfx view input | Out-Null
  Start-Sleep -Milliseconds 500
  Invoke-E2eAdb shell input tap $x $y
  Start-Sleep -Seconds 3
  Invoke-E2eAdb shell 'atrace --async_stop > /data/local/tmp/tap.trace' | Out-Null
  $local = Join-Path $script:repo '.local\tap.trace'
  Invoke-E2eAdb pull /data/local/tmp/tap.trace $local | Out-Null
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON (Join-Path $script:repo 'scripts\dev\tap-trace.ts') `
    $local $procId $jsTid | ConvertFrom-Json
}

# How soon the adhkar tab shows after a tap (atrace): on the first visit, ms from the tap to
# the frame that shows it and the JS thread's work before it; on a second visit (nothing new
# to draw), the JS work right after the tap. Both with all the JS work in the 2 s after the
# tap. Median of $Runs cold starts, to .local/perf-tab-<Name>.txt.
function Measure-E2eLatency([string]$Name = 'latest', [int]$Runs = 5) {
  Initialize-E2eEnv
  Invoke-E2eAdb root | Out-Null
  $results = foreach ($i in 1..$Runs) {
    Invoke-E2eAdb shell am force-stop $script:app
    Start-Sleep -Seconds 2
    Invoke-E2eAdb shell am start -W -n "$script:app/.MainActivity" | Out-Null
    Start-Sleep -Seconds 5
    Invoke-E2eAdb shell uiautomator dump /sdcard/ui.xml | Out-Null
    $xml = Invoke-E2eAdb shell cat /sdcard/ui.xml
    $m = [regex]::Match($xml, 'resource-id="tab-bar"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
    if (-not $m.Success) { throw 'No tab bar on screen' }
    $y = [int](([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2)
    $w = [int]$m.Groups[3].Value
    $procId = [int](Invoke-E2eAdb shell pidof $script:app)
    $threads = Invoke-E2eAdb shell "for t in /proc/$procId/task/*; do echo `${t##*/} `$(cat `$t/comm); done"
    $js = $threads | Where-Object { $_ -match '^\d+ mqt.*js' } | Select-Object -First 1
    if (-not $js) { throw 'No JS thread found' }
    $jsTid = [int]($js -split ' ')[0]
    $first = Invoke-E2eTracedTap ([int]($w / 2)) $y $procId $jsTid
    Invoke-E2eAdb shell input tap ([int]($w * 5 / 6)) $y
    Start-Sleep -Seconds 3
    $again = Invoke-E2eTracedTap ([int]($w / 2)) $y $procId $jsTid
    [pscustomobject]@{
      FirstFrame = $first.frameMs; FirstBurst = $first.burstMs; FirstBusy = $first.jsBusyMs
      AgainFrame = $again.frameMs; AgainBurst = $again.burstMs; AgainBusy = $again.jsBusyMs
    }
  }
  $mid = [int][math]::Floor($Runs / 2)
  $line = {
    param($label, $p)
    $v = $results | ForEach-Object { $_.$p }
    "  ${label}: $($v -join ', ') -> median $(($v | Sort-Object)[$mid])"
  }
  $text = @(
    "adhkar tab after a tap, ms ($Runs cold starts):",
    (& $line 'first visit, tap to frame   ' 'FirstFrame'),
    (& $line 'first visit, JS before frame' 'FirstBurst'),
    (& $line 'first visit, JS in 2 s      ' 'FirstBusy'),
    (& $line 'again, JS right after tap   ' 'AgainBurst'),
    (& $line 'again, JS in 2 s            ' 'AgainBusy')
  )
  $text | Out-File -Encoding utf8 (Join-Path $script:repo ".local\perf-tab-$Name.txt")
  $text
}

# Runs one Maestro file (e2e/<path>.yaml) and copies its named screenshots into $out.
function Invoke-E2eFile([string]$path, [string]$out) {
  $run = Join-Path $out '_run'
  maestro test "e2e\$path.yaml" --test-output-dir $run
  $code = $LASTEXITCODE
  # Named shots (takeScreenshot: <name>); Maestro's own step-*.png are debug output only.
  Get-ChildItem $run -Recurse -Filter *.png | Where-Object { $_.Name -notlike 'step-*' } |
    ForEach-Object { Copy-Item $_.FullName (Join-Path $out $_.Name) -Force }
  if ($code -ne 0) { throw "Maestro failed: e2e\$path.yaml (debug output in $run)" }
}

# Runs a suite: 'shots' (every screen, pictures) or 'flows' (user flows with checks).
# Pictures land in .local/shots/<Name>/. -Flow runs one file of the suite (no reset with -NoReset).
function Invoke-E2e([string]$suite, [string]$Name = 'latest', [switch]$Dark, [double]$FontScale = 1.0,
  [string]$Flow, [switch]$NoReset) {
  Initialize-E2eEnv
  Push-Location $script:repo
  try {
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/dev/e2e-strings.ts | Out-Null
    # A flow Maestro cannot read fails at once, with no step named: say which one.
    foreach ($f in Get-ChildItem e2e -Recurse -Filter *.yaml) {
      $check = maestro check-syntax $f.FullName 2>&1 | Out-String
      if ($LASTEXITCODE -ne 0) { throw "Bad flow $($f.Name): $check" }
    }
    $out = Join-Path $script:repo ".local\shots\$Name"
    if (-not $Flow) { Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Force $out | Out-Null
    if (-not $NoReset) { Reset-E2eDevice -Dark:$Dark -FontScale $FontScale }
    if ($Flow) { Invoke-E2eFile "$suite\$Flow" $out; return }
    Invoke-E2eFile $suite $out
    # The same plan seen a week later (the week grid, the end-of-week message).
    if (Test-Path "e2e\$suite-week-later.yaml") {
      $later = [datetime]::ParseExact($script:defaultDate, 'yyyy-MM-dd HH:mm', $null).AddDays(7)
      Set-E2eDate $later.ToString('yyyy-MM-dd HH:mm')
      Invoke-E2eFile "$suite-week-later" $out
    }
  }
  finally {
    Invoke-E2eAdb shell settings put system font_scale 1.0 | Out-Null
    Invoke-E2eAdb shell cmd uimode night no | Out-Null
    Pop-Location
  }
}
