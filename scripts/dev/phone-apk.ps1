# Builds the phone APK (release, arm64, signed with the debug key), keeps a copy in
# .local/apk/, and puts it behind the fixed public download link (owner, 2026-11-01):
#   https://github.com/TameemHabash/wirduk/releases/download/test-build/wirduk.apk
#
#   .\scripts\dev\phone-apk.ps1              # build, then update the link
#   .\scripts\dev\phone-apk.ps1 -SkipBuild   # update the link with the build just made
#
# Commit and push first: the APK must match a commit on the public main (the release's tag
# points at it). Stop Metro first (a release build next to it can run it out of memory).
# Keep Arabic out of this file (PowerShell 5.1 reads it as ANSI).
param([switch]$SkipBuild)

$repo = 'TameemHabash/wirduk'
$tag = 'test-build'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [Environment]::GetEnvironmentVariable('Path', 'User')

function Fail([string]$message) {
  Write-Host $message -ForegroundColor Red
  Pop-Location
  exit 1
}

Push-Location $root
if (git status --porcelain) { Fail 'Uncommitted changes: commit first, so the APK matches a commit.' }
$sha = (git rev-parse HEAD).Trim()
$short = $sha.Substring(0, 7)
git fetch -q origin main
git merge-base --is-ancestor $sha origin/main
if ($LASTEXITCODE -ne 0) { Fail "Commit $short is not on origin/main: push it first." }

$apk = Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk'
if (-not $SkipBuild) {
  if (-not (Test-Path (Join-Path $root 'android\gradlew.bat'))) {
    Fail 'No android/: run npx expo prebuild --platform android first.'
  }
  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
  $env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine')
  Push-Location (Join-Path $root 'android')
  .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Fail 'The Gradle build failed.' }
}
if (-not (Test-Path $apk)) { Fail "No APK at $apk" }

# An emulator build (x86_64) writes the same file, and an old file may be from an older commit.
$commitTime = [DateTimeOffset]::FromUnixTimeSeconds([long](git log -1 --format=%ct)).LocalDateTime
if ((Get-Item $apk).LastWriteTime -lt $commitTime) { Fail 'The APK is older than the commit: build again.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($apk)
$abis = $zip.Entries | Where-Object { $_.FullName -like 'lib/*/*' } |
  ForEach-Object { $_.FullName.Split('/')[1] } | Sort-Object -Unique
$zip.Dispose()
if (($abis -join ',') -ne 'arm64-v8a') { Fail "Not a phone build (ABIs: $($abis -join ', ')): build again." }

$keep = Join-Path $root ".local\apk\wirduk-$short-phone-arm64.apk"
New-Item -ItemType Directory -Force (Split-Path $keep) | Out-Null
Copy-Item $apk $keep -Force
$out = Join-Path $env:TEMP 'wirduk-apk'
New-Item -ItemType Directory -Force $out | Out-Null
$upload = Join-Path $out 'wirduk.apk'
Copy-Item $apk $upload -Force

$link = "https://github.com/$repo/releases/download/$tag/wirduk.apk"
$date = Get-Date -Format 'yyyy-MM-dd HH:mm'
$notes = @"
Test build of Wirduk for Android phones, from commit $short ($date).

- Download: $link (the link stays the same; each new build replaces the file).
- Install it over the previous test build: your data stays.
- It is signed with a test key: the Google Play version will need this one uninstalled first.
"@
$notesFile = Join-Path $out 'notes.md'
[IO.File]::WriteAllText($notesFile, $notes) # UTF-8 without a BOM

$tags = gh release list -R $repo --json tagName --jq '.[].tagName'
if ($LASTEXITCODE -ne 0) { Fail 'gh could not list the releases.' }
if ($tags -notcontains $tag) {
  gh release create $tag $upload -R $repo --target $sha --prerelease --title 'Test build (Android)' --notes-file $notesFile
  if ($LASTEXITCODE -ne 0) { Fail 'gh release create failed.' }
} else {
  # The tag moves to this commit; the file and the notes are replaced.
  gh api -X PATCH "repos/$repo/git/refs/tags/$tag" -f sha=$sha -F force=true | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'Moving the tag failed.' }
  gh release upload $tag $upload -R $repo --clobber
  if ($LASTEXITCODE -ne 0) { Fail 'gh release upload failed.' }
  gh release edit $tag -R $repo --notes-file $notesFile | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'gh release edit failed.' }
}

Write-Host "Kept: $keep"
Write-Host "Link: $link (commit $short)"
Pop-Location
