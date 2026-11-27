---
name: check-screens
description: Check that no screen of the app changed - release build for the emulator, the Maestro screen run, and a pixel compare with the baseline pictures. Use after changing app code that should not change what the user sees (a refactor, a speed fix), before finishing such a milestone, or when the owner asks to compare screens.
---

# Check the screens

Details: `e2e/README.md` and `e2e/CLAUDE.md`.

## Before

- The emulator `Wirdak_Pixel` runs (start it in the background:
  `& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Wirdak_Pixel -no-boot-anim -netdelay none -netspeed full`).
  It needs `hw.keyboard=no` in its `config.ini`.
- Metro is stopped (a release build next to it can run it out of memory).

## Run

```powershell
. .\scripts\dev\e2e.ps1
Install-E2eApk                     # release x86_64 build + install (-NoBuild: install the last build)
Invoke-E2e shots -Name latest      # every screen, from a clean install -> .local/shots/latest/
npm run shots:compare              # .local/shots/baseline vs .local/shots/latest
```

The build takes several minutes and the run about 10: start them in the background and wait
for the notice.

- Dark theme: `Invoke-E2e shots -Name dark -Dark`, then
  `npm run shots:compare -- .local/shots/baseline-dark .local/shots/dark`.
- Big font: `Invoke-E2e shots -Name big -FontScale 1.3`, then
  `npm run shots:compare -- .local/shots/baseline-big .local/shots/big`.
- One part only (keeps the app's data, so run the parts before it first):
  `Invoke-E2e shots -Name dev -Flow 03-reader -NoReset`.

## Read the result

- `shots:compare` lists only the screens that changed (exit code 1 if any) and writes
  `.local/shots/compare/index.html` (before / after / diff). Look at each listed picture.
- For each one: explain it (a scroll that landed a few pixels apart, a random message listed
  under `varying` in `e2e/shots-compare.json`) or fix the code. A real visible change needs the
  owner's yes first.
- Baselines (old code, commit 22803cf): `.local/shots/baseline`, `-dark`, `-big` (not in git).
  Screens 22–24 were taken again on 2026-11-27, after the approved notifications card fix (no
  card on a new install); the old ones are in `baseline*-before-card-fix/`. After any approved
  visible change, copy the new pictures of those screens into the baselines the same way.
- A failed Maestro step prints the flow; its debug pictures are in the run folder it names.
