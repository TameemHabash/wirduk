# e2e — Maestro runs, the emulator, release builds

How to run each kind (flows, timeline, shots, speed): `README.md` here. To compare every screen
with the baseline: the `/check-screens` skill.

## Rules

- Flows hold no typed Arabic: they find text by its key (`${output.s['key']}` as a pattern,
  `${output.raw['key']}` as plain text), from `e2e/.generated/strings.js`, which
  `scripts/dev/e2e-strings.ts` cuts from `common.json`.
- The runs use a **release** x86_64 build (`Install-E2eApk` in `scripts/dev/e2e.ps1`), never the
  dev build. Each run clears the app's data and fixes the date, theme and font.
- Scroll with `runFlow: _scroll.yaml` (a slow drag), never Maestro's `scroll` (it flings). Hide
  the keyboard before a picture (`waitForAnimationToEnd`, then `hideKeyboard`). A screen that
  changes by design goes under `varying` in `shots-compare.json`; a screen right after a drag
  under `scrolled`.
- Leave the app with Home, not a force-stop, when its alarms matter: a force-stop cancels them
  (timeline day 40).
- A new flow file in `flows/`, `shots/` or `timeline/` must be named in its parent file
  (`flows.yaml`, `shots.yaml`) or in `scripts/dev/e2e-timeline.ps1`.

## The emulator (`Wirdak_Pixel`: Android 16, x86_64, `google_apis`)

- It needs `hw.keyboard=no` in its `config.ini`: with the PC's keyboard as a physical one, Gboard
  shows only a small floating bar that Maestro cannot hide.
- If it hangs ("Not Responding", no CPU; adb gets no answer), on start or in a run: stop it,
  delete the `*.lock` files in its `.avd` folder, start it with `-no-snapshot-load`. It can also
  quit in a run with exit code 59 (GPU errors in its log, not the app): the same restart, then
  run the suite again.
- The timeline moves the date with `adb root` + `date`: that needs the `google_apis` image.
- `npx expo run:android --device` wants the AVD name (`Wirdak_Pixel`), not `emulator-5554`.
- Changing `font_scale` restarts the app. adb typing: `input keyboard text 'Word%sWord'` (Latin
  only).
- Pull binary files with `run-as com.wirduk.app cat … > /data/local/tmp/x` (inside
  `adb shell`), then `adb pull` (a PowerShell `>` breaks binary data).
- The dev build's floating "Tools" button covers the back arrow (top-right in RTL):
  `adb shell input keyevent 4` for Back.

## Release builds (the e2e APK and the phone APK)

- `android/` is generated (not in git): `npx expo prebuild --platform android`. Prebuild deletes
  and recreates it, and fails with EBUSY while Metro or an adb server started inside `android/`
  runs (stop Metro; `adb kill-server` from the repo root). Prebuild again after
  `npm run branding:build` or a plugin change.
- Stop Metro before `assembleRelease`: Metro can run out of memory ("JavaScript heap out of
  memory") while Gradle changes thousands of files under `android/`.
- The phone APK: only when the owner asks, with `/phone-apk`. It is signed with the debug key, so
  `install -r` keeps the owner's data, and it replaces the file behind the fixed public link.
