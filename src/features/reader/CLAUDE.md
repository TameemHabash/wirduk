# src/features/reader — the reader

- `components/Reader.tsx`: the reader (the pager, the tap zone, auto-advance, «إتمام»), also used
  by «أدومها»'s ward. `screens/ReaderScreen.tsx` loads a category; `CompletionScreen.tsx` is the
  finish screen; `logic/navigation.ts` the page moves.
- Counts live in memory (`state/counter-store.ts`); leaving the reader resets that category's
  counts. A component watches only the count it shows (`useCount`, `useCompleteFlags` in
  `state/useCounters.ts`), so a tap draws only the counter, the progress and «إتمام».
- The reader draws the pages near the current one (`useDrawnPages`: 3 on each side; a page once
  drawn stays).
- "Continue where I stopped": `src/data/session.ts` + `SessionRepository` +
  `hooks/useSessionRestore.ts` (5 hours; a toast on return).
- The audio of a dhikr: `src/features/audio/` (`hooks/useDhikrAudio.ts`: play, repeat × count,
  autoplay, lock screen). The reader uses only the audio actions (`useAudioActions`), not
  `useAudio()` (it changes on every download tick). Recording file names: the book's have no
  extension (`75` → `75.mp3`), the owner's keep theirs (`1001.m4a`; `audioFileName` in
  `audio/logic/audio-plan.ts`).
- A link to the chapter already open goes to its dhikr; the param is cleared after use, so the
  same link works again (owner, 2026-11-27).

## Traps

- The reader reloads its data on focus (`useFocusEffect(state.reload)`): a new `adhkar` array
  with the same ids. Never key an effect on the array itself.
- **With the screen off (Android), JS timers and React Native view events (the pager's
  `onPageSelected`) wait until the screen is on**; native module events (expo-audio) still
  arrive. Anything the audio does with the screen off must not wait for `setTimeout` or a view
  event (`moveTo` and `pendingPages` in `components/Reader.tsx`). Keep those rules together.
- `react-native-pager-view` after a rotation keeps its offset in pixels of the old width (the page
  sits shifted) and reports a wrong "page selected". The reader makes a new pager when the
  pager's **measured** width changes (`onPagerLayout`, `hooks/usePagerRebuild.ts`), and accepts a
  page change only during a real scroll. Keying it on the orientation alone was not enough (it
  was rebuilt before the new width was known).
- **Once the audio has played, a swipe from the recent apps can leave the process alive** (the
  media service; every time on the owner's Samsung phones). The app then starts again from Home
  in the same JS runtime: module-level state survives. "Once per app start" state must be reset
  in `newAppStart()` (`hooks/useSessionRestore.ts`, called by `src/providers/AppProviders.tsx`).
  To test on the emulator: play the audio, swipe the app away while it plays, start it from its
  icon (same pid in `adb shell ps -A`). `am start --activity-clear-task` is not the same: the
  old screen closes after the new one.

## Tests

- Helpers: `openReader`, `openChapter`, `tapCounter`, `counted`, `position`
  (`src/test-utils/reader.tsx`); what the audio played: `recordingsHeard()`, `ticksHeard()`.
- A swipe: `fireEvent(getByTestId('pager'), 'pageScrollStateChanged', …'dragging')`, then
  `'pageSelected'`.
