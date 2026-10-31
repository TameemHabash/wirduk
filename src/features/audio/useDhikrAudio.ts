import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useTranslation } from 'react-i18next';

import type { Dhikr } from '@/data/models';
import { useSettings } from '@/data/settings/SettingsProvider';
import { customAudioUri } from '@/features/custom/custom-audio';

import { type AudioErrorKind, classifyError } from './audio-plan';
import { useAudio } from './AudioProvider';

export type DhikrAudioPhase = 'idle' | 'loading' | 'playing' | 'paused';

/** Why audio could not play (a cancel is not an error). */
export type DhikrAudioError = Exclude<AudioErrorKind, 'cancelled'>;

interface Options {
  categoryTitle: string;
  adhkar: readonly Dhikr[];
  /**
   * "Count with the audio" (setting): called after each finished play. When
   * that play completed the dhikr, the reader moves on by itself and returns
   * the dhikr it moves to (null: the category is finished); that one plays
   * next, at once (with autoplay on), also with the screen off.
   */
  onPlayed?: (dhikr: Dhikr) => { next: Dhikr | null } | undefined;
  /** How many times to play a dhikr's recording. Default: count ÷ times said per recording. */
  playsFor?: (dhikr: Dhikr) => number;
}

/** Plays of a recording for the whole count (e.g. count 100, said 4 times per recording: 25). */
export function playsForCount(dhikr: Pick<Dhikr, 'count' | 'audioRepeats'>): number {
  return Math.max(1, Math.ceil(dhikr.count / dhikr.audioRepeats));
}

/** Which play of the active recording this is (of `total` plays for the count). */
export interface AudioRepeat {
  current: number;
  total: number;
}

export interface DhikrAudio {
  /** The dhikr whose audio is loaded, or null. */
  activeId: number | null;
  phase: DhikrAudioPhase;
  /** Set while a dhikr's recording is active. */
  repeat: AudioRepeat | null;
  error: DhikrAudioError | null;
  /** Play, pause, resume, or cancel loading, for this dhikr. */
  toggle: (dhikr: Dhikr) => void;
  /** The reader moved to another dhikr: stop audio that belongs to a different one. */
  onShow: (dhikrId: number) => void;
  /**
   * The user finished `done` by counting (taps or «إتمام»), and the reader moves to `next`.
   * If they were listening to its recording (playing, or its plays just ended), the next
   * dhikr's plays at once (autoplay); a paused recording stays stopped.
   */
  continueAfter: (done: Dhikr, next: Dhikr | null) => void;
}

/**
 * Plays adhkar recordings in the reader.
 *
 * - Shipped adhkar: downloaded on first play (see AudioDownloads), then
 *   played from the phone. The user's own: played from their folder.
 * - A recording plays until the dhikr has been said its count: count ÷ the
 *   times one recording says it (`audioRepeats`, usually 1). E.g. سبحان الله
 *   وبحمده (count 100): 100 plays, or 25 if the recording said it 4 times.
 *   By default it does not count for the user: taps do. With "count with the
 *   audio" (setting) each play counts (see onPlayed).
 * - When the audio does not count, the reader waits for the user's count
 *   after the last play (owner, 2026-10-31: it used to move on with the
 *   dhikr not counted). When the user finishes it, autoplay (setting, on by
 *   default) plays the next dhikr (continueAfter). When the audio counts, the
 *   play that completes the dhikr moves the reader on, and the next one plays.
 * - Background playback (setting, on by default): keeps playing with the
 *   screen off, with lock-screen controls. When off, audio pauses when the
 *   app leaves the screen.
 * - Leaving the reader stops the audio (the player is released).
 */
export function useDhikrAudio({ categoryTitle, adhkar, onPlayed, playsFor }: Options): DhikrAudio {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { downloads, lang, notifyChanged } = useAudio();
  const player = useAudioPlayer(null);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [phase, setPhase] = useState<DhikrAudioPhase>('idle');
  const [error, setError] = useState<DhikrAudioError | null>(null);
  const [repeat, setRepeatState] = useState<AudioRepeat | null>(null);

  // Read by player events, which fire outside React's render.
  const activeRef = useRef<number | null>(null);
  const repeatRef = useRef<AudioRepeat | null>(null);
  const request = useRef(0);
  const started = useRef(false);
  const loading = useRef(false);
  /** The dhikr whose recording the user is listening to (kept after its last play; not after a pause). */
  const listening = useRef<number | null>(null);

  const { backgroundPlayback, autoplayNext } = settings;

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      // The recorder (own adhkar) turns this on; playback must not use the earpiece.
      allowsRecording: false,
      shouldPlayInBackground: backgroundPlayback,
      // Required for lock-screen controls; also pauses other apps' audio.
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, [backgroundPlayback]);

  const setActive = useCallback((id: number | null) => {
    activeRef.current = id;
    setActiveId(id);
  }, []);

  const setRepeat = useCallback((next: AudioRepeat | null) => {
    repeatRef.current = next;
    setRepeatState(next);
  }, []);

  const stop = useCallback(() => {
    request.current++;
    loading.current = false;
    listening.current = null;
    player.pause();
    setActive(null);
    setRepeat(null);
    setPhase('idle');
  }, [player, setActive, setRepeat]);

  const start = useCallback(
    async (dhikr: Dhikr) => {
      if (!dhikr.audioFile) return;
      const mine = ++request.current;
      loading.current = true;
      started.current = false;
      listening.current = dhikr.id;
      player.pause();
      setActive(dhikr.id);
      setRepeat({
        current: 1,
        total: Math.max(1, playsFor ? playsFor(dhikr) : playsForCount(dhikr)),
      });
      setError(null);
      setPhase('loading');
      try {
        const uri = dhikr.custom
          ? customAudioUri(dhikr.audioFile)
          : await downloads.ensure(lang, dhikr.audioFile);
        if (mine !== request.current) return;
        if (!dhikr.custom) notifyChanged();
        loading.current = false;
        player.replace({ uri });
        player.play();
        setPhase('playing');
        if (backgroundPlayback) {
          try {
            player.setActiveForLockScreen(true, { title: categoryTitle, artist: t('appName') });
          } catch {
            // Lock-screen controls are a nice extra; playback works without them.
          }
        }
      } catch (e) {
        if (mine !== request.current) return;
        loading.current = false;
        listening.current = null;
        setActive(null);
        setRepeat(null);
        setPhase('idle');
        const kind = classifyError(e);
        if (kind !== 'cancelled') setError(kind);
      }
    },
    [
      backgroundPlayback,
      categoryTitle,
      downloads,
      lang,
      notifyChanged,
      player,
      playsFor,
      setActive,
      setRepeat,
      t,
    ],
  );

  // Player events: the end of a recording (repeat, then autoplay) and pause /
  // resume from outside the app (lock screen, headphones unplugged).
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (loading.current || activeRef.current === null) return;
      if (status.didJustFinish) {
        const active = adhkar.find((d) => d.id === activeRef.current);
        const counted = active && onPlayed ? onPlayed(active) : undefined;
        const rep = repeatRef.current;
        if (!counted && rep && rep.current < rep.total) {
          setRepeat({ current: rep.current + 1, total: rep.total });
          void player
            .seekTo(0)
            .then(() => player.play())
            .catch(() => undefined);
          return;
        }
        if (counted) {
          // The reader moved on, as after the last tap: play the dhikr it moved to.
          const next = counted.next;
          if (next && autoplayNext && next.audioFile) {
            void start(next);
          } else {
            listening.current = null;
            setActive(null);
            setRepeat(null);
            setPhase('idle');
          }
          return;
        }
        // The plays are over but the audio did not count: stay on this dhikr until the user
        // has counted it (continueAfter then plays the next one).
        setActive(null);
        setRepeat(null);
        setPhase('idle');
        return;
      }
      if (!status.isLoaded || status.isBuffering) return;
      if (status.playing) {
        started.current = true;
        setPhase('playing');
      } else if (started.current) {
        setPhase('paused');
      }
    });
    return () => sub.remove();
  }, [adhkar, autoplayNext, onPlayed, player, setActive, setRepeat, start]);

  // Without background playback, pause when the app leaves the screen.
  useEffect(() => {
    if (backgroundPlayback) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && activeRef.current !== null) {
        player.pause();
        setPhase('paused');
      }
    });
    return () => sub.remove();
  }, [backgroundPlayback, player]);

  const toggle = useCallback(
    (dhikr: Dhikr) => {
      if (activeRef.current !== dhikr.id) {
        void start(dhikr);
      } else if (phase === 'loading') {
        stop();
      } else if (phase === 'playing') {
        // A pause breaks the chain: counting the dhikr to its end then plays nothing.
        listening.current = null;
        player.pause();
        setPhase('paused');
      } else {
        listening.current = dhikr.id;
        player.play();
        setPhase('playing');
      }
    },
    [phase, player, start, stop],
  );

  const onShow = useCallback(
    (dhikrId: number) => {
      setError(null);
      if (activeRef.current !== null && activeRef.current !== dhikrId) stop();
      else if (listening.current !== dhikrId) listening.current = null;
    },
    [stop],
  );

  const continueAfter = useCallback(
    (done: Dhikr, next: Dhikr | null) => {
      if (listening.current !== done.id) return;
      if (next && autoplayNext && next.audioFile) void start(next);
      else stop();
    },
    [autoplayNext, start, stop],
  );

  return { activeId, phase, repeat, error, toggle, onShow, continueAfter };
}
