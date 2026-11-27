import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Pause after a dhikr is complete, so the full ring is seen before moving on. */
const ADVANCE_DELAY_MS = 450;

/**
 * The short pause before the reader moves on by itself. `after(go)` runs `go` after the pause,
 * or at once with the screen off (JS timers wait until the screen is on, and the audio must not
 * wait). `cancel()` drops a move not made yet (a swipe during the pause wins).
 */
export function useAdvanceTimer(): { after: (go: () => void) => void; cancel: () => void } {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  const after = useCallback(
    (go: () => void) => {
      cancel();
      if (AppState.currentState === 'background') go();
      else timer.current = setTimeout(go, ADVANCE_DELAY_MS);
    },
    [cancel],
  );
  return { after, cancel };
}
