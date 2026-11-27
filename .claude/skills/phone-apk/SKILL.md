---
name: phone-apk
description: Build the phone APK (release, arm64) and put it behind the fixed public download link the owner and testers install from. Use only when the owner asks for an APK or a phone build, never on your own.
---

# Build the phone APK

Only when the owner asks. The script replaces the file behind the public link
https://github.com/TameemHabash/wirduk/releases/download/test-build/wirduk.apk (pre-release
`test-build`; its tag moves to the built commit).

## Before

1. Everything is committed and pushed to `origin/main` (the script refuses otherwise: the APK
   must match a public commit).
2. Metro is stopped (Gradle next to it can run it out of memory).
3. `android/` exists and is current. Make it with `npx expo prebuild --platform android` when it
   is missing, and **again** after `npm run branding:build` (icon, splash) or a plugin change:
   the APK takes the copies in `android/`. Prebuild fails with EBUSY while Metro or an adb server
   started inside `android/` runs (stop Metro; `adb kill-server` from the repo root).

## Run

```powershell
.\scripts\dev\phone-apk.ps1              # build arm64, keep a copy in .local/apk/, update the link
.\scripts\dev\phone-apk.ps1 -SkipBuild   # update the link with the last phone build
```

The build takes several minutes: run it in the background.

## After

- The APK is signed with the debug key, so it installs over the last test build and keeps the
  user's data. Over USB instead:
  `& $adb -s <serial> install -r android\app\build\outputs\apk\release\app-release.apk`
  (the owner's phone serial: `adb devices`, or `.local/devices.md`).
- Tell the owner the commit it was built from and the link. Note it in `docs/status.md`
  ("Devices").
- An emulator build (x86_64) writes the same file: build again before `-SkipBuild` if one ran.
