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
