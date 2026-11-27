import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/ThemeProvider';
import { toneColors } from '@/theme/tones';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** The icon tile's color: teal (default), gold (a ward, a warning), red (an error). */
export type ToastTone = 'primary' | 'gold' | 'danger';

export interface ToastOptions {
  message: string;
  /** Makes the whole toast a button (a chevron at its end); it closes when pressed. */
  onPress?: () => void;
  /** The icon in the tile at its start. Default: info. */
  icon?: IconName;
  tone?: ToastTone;
  /** How long it stays. Default 4 s. */
  durationMs?: number;
}

export const TOAST_DURATION_MS = 4000;

interface ToastApi {
  show: (toast: ToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);
/** Sets how high the toast sits above the bottom (the tab bar's height while it shows; 0: none). */
const ToastOffsetContext = createContext<(offset: number) => void>(() => undefined);

/**
 * A short message near the bottom of the screen, over every screen: a light floating card
 * (redesign, 2026-11-26). It never blocks the screen below: only the toast takes touches.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const [offset, setOffset] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const hide = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const show = useCallback((next: ToastOptions) => {
    clearTimer();
    setToast({ ...next, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), next.durationMs ?? TOAST_DURATION_MS);
    AccessibilityInfo.announceForAccessibility(next.message);
  }, []);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={api}>
      <ToastOffsetContext.Provider value={setOffset}>
        <View style={styles.fill}>
          {children}
          {toast && <ToastView key={toast.key} toast={toast} offset={offset} onClose={hide} />}
        </View>
      </ToastOffsetContext.Provider>
    </ToastContext.Provider>
  );
}

function ToastView({
  toast,
  offset,
  onClose,
}: {
  toast: ToastOptions;
  offset: number;
  onClose: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { onPress } = toast;
  const tile = toneColors(colors, toast.tone ?? 'primary');
  return (
    <View
      pointerEvents="box-none"
      testID="toast-layer"
      // Above the tab bar on its screens; lower on screens with no tab bar (design).
      style={[
        styles.layer,
        { paddingBottom: offset > 0 ? offset + spacing.md : insets.bottom + spacing.lg },
      ]}
    >
      <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(200)}>
        <Pressable
          accessibilityRole={onPress ? 'button' : 'text'}
          accessibilityLabel={toast.message}
          accessibilityLiveRegion="polite"
          disabled={!onPress}
          onPress={() => {
            onClose();
            onPress?.();
          }}
          testID="toast"
          style={({ pressed }) => [
            styles.toast,
            {
              backgroundColor: colors.toast,
              borderColor: colors.border,
              marginHorizontal: 14,
              gap: spacing.sm + 2,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[styles.tile, { backgroundColor: tile.background }]}>
            <Icon name={toast.icon ?? 'info'} size={17} color={tile.icon} />
          </View>
          <AppText style={styles.text}>{toast.message}</AppText>
          {onPress ? <Icon name="forward" size={18} color={colors.primaryInk} /> : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Lifts the toast above a bar at the bottom of the screen while offset > 0 (the tab bar,
 * with the navigation bar under it). Put back on unmount.
 */
export function useToastOffset(offset: number): void {
  const setOffset = useContext(ToastOffsetContext);
  useEffect(() => {
    setOffset(offset);
    return () => setOffset(0);
  }, [offset, setOffset]);
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: '#0A1416',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, fontSize: 14, lineHeight: 22 },
});
