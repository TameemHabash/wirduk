import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const KEEP_AWAKE_TAG = 'wirduk-reader';

/** Keeps the screen on while the reader is open and the setting is on (on by default). */
export function useKeepScreenOn(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
  }, [enabled]);
}
