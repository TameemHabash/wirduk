# End-to-end tests (Maestro)

The app is driven on the Android emulator by [Maestro](https://maestro.dev) flows. They run on
a **release** build (no Metro, no dev button), from a fixed state: clean app data, the date
2026-11-27 09:00, a quiet status bar, light theme, font 1.0. So two runs of the same code give
the same pictures.

| File                    | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `flows.yaml`            | The user flows, each with checks (`npm run e2e`).                |
| `flows/*.yaml`          | The parts of `flows.yaml` (each can run alone).                  |
| `timeline/*.yaml`       | Small flows for the «أدومها» timeline (`npm run e2e:timeline`).  |
| `shots.yaml`            | Every screen, in order, from a clean install; a picture of each. |
| `shots-week-later.yaml` | The same plan 7 days later (run after the date moves).           |
| `shots/*.yaml`          | The parts of `shots.yaml` (each can run alone).                  |
| `shots-compare.json`    | Rules for the compare (scrolled screens, screens that vary).     |
| `.generated/strings.js` | The UI strings, cut from `common.json` (not in git).             |

Three kinds of runs (RF6): **flows** check what a user does (a chapter read to its finish
screen, own adhkar, continue where I stopped, a reminder and its permission, «أدومها» set up and
a ward read); **the timeline** lives «أدومها» over 40 days by moving the emulator's date (below);
**shots** take a picture of every screen for the compare.

Flows never hold typed Arabic: they find text by its key, e.g.
`tapOn: ${output.s['adwamuha.setup.enable']}` (a pattern) or
`inputText: ${output.raw['home.morningBadge']}` (the plain text). The keys come from
`src/i18n/locales/ar/common.json` and, under `owner.`, the owner's labels.

## Run (Windows, PowerShell)

Needs: the emulator `Wirdak_Pixel` running (a `google_apis` image, for `adb root`), Maestro in
the PATH (`%USERPROFILE%\.maestro\bin`), JDK 17.

```powershell
. .\scripts\dev\e2e.ps1
Install-E2eApk                      # release x86_64 build + install (-NoBuild to skip the build)
Invoke-E2e flows                    # the user flows and their checks (npm run e2e), ~3 min
Invoke-E2e shots -Name latest       # pictures -> .local/shots/latest/
Invoke-E2e shots -Name dark -Dark   # dark theme
Invoke-E2e shots -Name big -FontScale 1.3
npm run shots:compare               # .local/shots/baseline vs .local/shots/latest
```

`shots:compare` prints only the screens that changed and writes
`.local/shots/compare/index.html` (before / after / diff). The baseline was taken from commit
22803cf, before the refactor.

Two runs of the same code give the same pictures, with these rules:

- Scroll with `runFlow: _scroll.yaml` (a slow drag), never Maestro's `scroll` (it flings, and
  the distance changes from run to run). Even a slow drag can land a few pixels apart, so a
  screen taken right after a drag is listed under `scrolled` in `shots-compare.json`: each band
  of it may line up within 12 pixels before it is compared. Every other screen is compared
  pixel by pixel.
- A screen that changes by design (the message after a ward is picked at random) is listed
  under `varying`: the compare shows it but does not count it.
- Hide Android's keyboard before a picture (`waitForAnimationToEnd`, then `hideKeyboard`): it is not ours and changes. The emulator needs `hw.keyboard=no` in its `config.ini`: with the PC's keyboard as a physical one, Gboard shows only a small floating bar that Maestro cannot hide (since 2026-11-27).

To work on one part: `Invoke-E2e shots -Name dev -Flow 03-reader -NoReset` (keeps the app's
data, so run the parts before it first).

## The «أدومها» timeline (`npm run e2e:timeline`, about 30 minutes)

`scripts/dev/e2e-timeline.ps1` (`Invoke-E2eTimeline`) starts from a clean install on Saturday
2026-11-28 and moves the emulator's date day by day (`adb root`, `date`). The days with nothing to
check are read "outside the app" on «مساري» (two taps), so each takes a few seconds. Checks:

| Day        | What is checked                                                              |
| ---------- | ---------------------------------------------------------------------------- |
| 1          | Setup from step 1; «وردك اليوم», step 1 of 24, the welcome; both wards read  |
| 7 (Friday) | The end of the first good week: Home has its word                            |
| 28         | The 4th good week: «جاهز لإضافة الذكر التالي؟»; «أبقِني أسبوعًا آخر»         |
| 34         | No question before 7 days                                                    |
| 35         | The question again; «أضِف الذكر التالي»: step 2                              |
| 36, 37     | A break of a week (its line on «مساري»), ended early                         |
| 38         | «ارجع إلى الخطوة 1»                                                          |
| 39         | The ward read in parts: opened again, it goes on at the dhikr not read       |
| 40         | The morning reminder rings at 6:00, tapped at 17:00: «انتهى وقت ورد الصباح.» |

A failed check stops the run and names the day; Maestro's output is in `.local/timeline/_run`.
The flows take variables (`-e SESSION=morning`, `-e ACTION=keep`). Maestro's `launchApp`
grants the permissions here (the reminder rings without Android's question).

## Speed (after a shots run, so the app has data)

```powershell
Measure-E2ePerf -Name latest      # cold start (5 runs) and frames while swiping 20 reader pages
Measure-E2eCpu -Name latest       # CPU ms of the JS and UI threads: the adhkar tab, the reader, taps
Measure-E2eLatency -Name latest   # ms from a tap on the adhkar tab to the frame that shows it (atrace)
```

Each writes `.local/perf-*-<Name>.txt`. `Measure-E2eLatency` reads its traces with
`scripts/dev/tap-trace.ts` (`--timeline` prints each JS run and frame of the first second).
The emulator's numbers move from run to run (the cold start most): compare medians, and
measure before and after on the same emulator.
