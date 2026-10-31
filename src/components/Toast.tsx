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

import { AppText } from './AppText';

export interface ToastOptions {
  message: string;
  /** Makes the whole toast a button; it closes when pressed. */
  onPress?: () => void;
  /** How long it stays. Default 4 s. */
  durationMs?: number;
}

export const TOAST_DURATION_MS = 4000;

interface ToastApi {
  show: (toast: ToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * A short message at the bottom of the screen, over every screen. It never
 * blocks the screen below: only the toast itself takes touches.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
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
      <View style={styles.fill}>
        {children}
        {toast && <ToastView key={toast.key} toast={toast} onClose={hide} />}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onClose }: { toast: ToastOptions; onClose: () => void }) {
  const { colors, radii, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { onPress } = toast;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { paddingBottom: insets.bottom + spacing.lg }]}
    >
      <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(200)}>
        <Pressable
          accessibilityRole={onPress ? 'button' : 'text'}
          accessibilityLiveRegion="polite"
          disabled={!onPress}
          onPress={() => {
            onClose();
            onPress?.();
          }}
          style={({ pressed }) => [
            styles.toast,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              marginHorizontal: spacing.lg,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <AppText tone="onPrimary" style={styles.text}>
            {toast.message}
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
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
    minHeight: 48,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  text: { textAlign: 'center' },
});
