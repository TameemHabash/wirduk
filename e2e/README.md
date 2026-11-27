# End-to-end tests (Maestro)

The app is driven on the Android emulator by [Maestro](https://maestro.dev) flows. They run on
a **release** build (no Metro, no dev button), from a fixed state: clean app data, the date
2026-11-27 09:00, a quiet status bar, light theme, font 1.0. So two runs of the same code give
the same pictures.

| File                    | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `shots.yaml`            | Every screen, in order, from a clean install; a picture of each. |
| `shots-week-later.yaml` | The same plan 7 days later (run after the date moves).           |
| `shots/*.yaml`          | The parts of `shots.yaml` (each can run alone).                  |
| `shots-compare.json`    | Rules for the compare (scrolled screens, screens that vary).     |
| `.generated/strings.js` | The UI strings, cut from `common.json` (not in git).             |

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
