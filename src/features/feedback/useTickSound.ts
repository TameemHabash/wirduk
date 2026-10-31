import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';

/** The level is set in the file itself: soft enough to be noticed, not to startle. */
const TICK = require('../../../assets/sounds/tick.wav') as number;

/**
 * Returns a function that plays the short count tick.
 * Nothing is loaded while the setting is off.
 */
export function useTickSound(enabled: boolean): () => void {
  const player = useAudioPlayer(enabled ? TICK : null);

  return useCallback(() => {
    if (!enabled) return;
    // Restart from the beginning, so fast taps each get their own tick.
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  }, [enabled, player]);
}
