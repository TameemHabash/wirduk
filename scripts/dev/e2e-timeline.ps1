# The Adwamuha timeline on the emulator (RF6): the release build, the emulator's date moved day by
# day, small Maestro flows (e2e/timeline/), checks at the key points. Keep Arabic out of this file.
#
#   . .\scripts\dev\e2e-timeline.ps1
#   Install-E2eApk            # release x86_64 build + install (once)
#   Invoke-E2eTimeline        # about 30 minutes; or npm run e2e:timeline
#
# Day 1 is Saturday 2026-11-28 (weeks start on Saturday, the setting's default). The days in
# between are read "outside the app" on the path screen (two taps a day) to keep the run short.

. (Join-Path $PSScriptRoot 'e2e.ps1')

$script:timelineStart = [datetime]::ParseExact('2026-11-28', 'yyyy-MM-dd', $null)
$script:timelineDay = 0

# Moves the emulator to day $day of the timeline at $time ('HH:mm').
function Set-E2eTimelineDay([int]$day, [string]$time) {
  $script:timelineDay = $day
  $date = $script:timelineStart.AddDays($day - 1).ToString('yyyy-MM-dd')
  Set-E2eDate "$date $time"
  Write-Host "day $day ($date $time)"
}

# Runs e2e/timeline/<flow>.yaml with its variables; stops the timeline when it fails.
function Invoke-E2eTimelineFlow([string]$flow, [hashtable]$vars = @{}) {
  $out = Join-Path $script:repo '.local\timeline\_run'
  $argList = @('test', "e2e\timeline\$flow.yaml", '--test-output-dir', $out)
  foreach ($k in $vars.Keys) { $argList += @('-e', "$k=$($vars[$k])") }
  # A notification shade left open (a failed run) would cover the app.
  Invoke-E2eAdb shell cmd statusbar collapse | Out-Null
  maestro @argList | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Timeline: $flow failed on day $script:timelineDay (debug output in $out)"
  }
  Write-Host "  ok: $flow"
}

# Days $from..$to read outside the app at 20:00 (both wards).
function Invoke-E2eTimelineDays([int]$from, [int]$to) {
  foreach ($d in $from..$to) {
    Set-E2eTimelineDay $d '20:00'
    Invoke-E2eTimelineFlow 'mark-today'
  }
}

function Invoke-E2eTimeline {
  Initialize-E2eEnv
  Push-Location $script:repo
  $watch = [Diagnostics.Stopwatch]::StartNew()
  try {
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/dev/e2e-strings.ts | Out-Null
    foreach ($f in Get-ChildItem e2e\timeline -Filter *.yaml) {
      $check = maestro check-syntax $f.FullName 2>&1 | Out-String
      if ($LASTEXITCODE -ne 0) { throw "Bad flow $($f.Name): $check" }
    }
    Remove-Item .local\timeline -Recurse -Force -ErrorAction SilentlyContinue
    Reset-E2eDevice -date ($script:timelineStart.ToString('yyyy-MM-dd') + ' 09:00')

    # Day 1: the setup (step 1), both wards read in the reader.
    Set-E2eTimelineDay 1 '09:00'
    Invoke-E2eTimelineFlow 'day1-setup'
    Set-E2eTimelineDay 1 '18:00'
    Invoke-E2eTimelineFlow 'read-ward' @{ SESSION = 'evening' }

    # The end of week 1 (Friday, day 7): Home has the week's word.
    Invoke-E2eTimelineDays 2 7
    Invoke-E2eTimelineFlow 'check-week-word'

    # A full step: the 4th good week ends on day 28; "keep me one more week".
    Invoke-E2eTimelineDays 8 28
    Invoke-E2eTimelineFlow 'question' @{ ACTION = 'keep' }
    Invoke-E2eTimelineDays 29 34
    Invoke-E2eTimelineFlow 'no-question'
    # Seven days later the question is back: "add the next dhikr" (step 2).
    Invoke-E2eTimelineDays 35 35
    Invoke-E2eTimelineFlow 'question' @{ ACTION = 'add' }

    # A break and its end; a step back.
    Set-E2eTimelineDay 36 '20:00'
    Invoke-E2eTimelineFlow 'take-break'
    Set-E2eTimelineDay 37 '20:00'
    Invoke-E2eTimelineFlow 'end-break'
    Set-E2eTimelineDay 38 '20:00'
    Invoke-E2eTimelineFlow 'step-back'

    # The ward read in parts, in its window.
    Set-E2eTimelineDay 39 '09:00'
    Invoke-E2eTimelineFlow 'ward-in-parts'

    # A reminder tapped outside the ward's time: on at 05:00; it rings at 06:00; tapped at 17:00.
    Set-E2eTimelineDay 40 '05:00'
    Invoke-E2eTimelineFlow 'reminder-on'
    Set-E2eTimelineDay 40 '06:01'
    Start-Sleep -Seconds 20
    Set-E2eTimelineDay 40 '17:00'
    Invoke-E2eTimelineFlow 'reminder-tap'

    Write-Host "Timeline passed in $([int]$watch.Elapsed.TotalMinutes) min."
  }
  finally {
    Pop-Location
  }
}
