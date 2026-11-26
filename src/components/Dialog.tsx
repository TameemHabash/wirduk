import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button, type ButtonKind } from './Button';
import { Icon, type IconName } from './Icon';

/** The icon tile's color: teal (most), red (a delete, an undo), gold (a warning, a choice). */
export type DialogTone = 'primary' | 'danger' | 'gold';

export interface DialogAction {
  label: string;
  /** Default: the first action is filled (primary), the others secondary. */
  kind?: ButtonKind;
  /** Red text on a secondary or plain button ("discard" when keeping is the main action). */
  destructive?: boolean;
  onPress?: () => void;
  /** Runs when the dialog is closed without a choice (back button, a tap outside). */
  cancel?: boolean;
}

export interface DialogOptions {
  icon: IconName;
  tone?: DialogTone;
  /** A string, or text parts (e.g. a chapter name in bold teal: `DialogName`). */
  title: ReactNode;
  body?: string;
  /** Shown between the text and the buttons (e.g. the hadith card). */
  content?: ReactNode;
  /** Top to bottom: the action first, cancel last (design). */
  actions: DialogAction[];
}

interface DialogApi {
  show: (dialog: DialogOptions) => void;
  hide: () => void;
}

const DialogContext = createContext<DialogApi | null>(null);

/**
 * The app's own dialog instead of Android's (redesign, 2026-11-26): an icon tile, the title,
 * the text, then full-width buttons stacked. One at a time; a new one replaces the old.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(DialogOptions & { key: number }) | null>(null);
  const current = useRef<DialogOptions | null>(null);

  const hide = useCallback(() => {
    current.current = null;
    setDialog(null);
  }, []);
  const show = useCallback((next: DialogOptions) => {
    current.current = next;
    setDialog({ ...next, key: Date.now() });
  }, []);

  const choose = useCallback(
    (action: DialogAction | undefined) => {
      hide();
      action?.onPress?.();
    },
    [hide],
  );
  const dismiss = useCallback(() => {
    const open = current.current;
    choose(open?.actions.find((a) => a.cancel));
  }, [choose]);

  const api = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && (
        <DialogView key={dialog.key} dialog={dialog} onChoose={choose} onDismiss={dismiss} />
      )}
    </DialogContext.Provider>
  );
}

function DialogView({
  dialog,
  onChoose,
  onDismiss,
}: {
  dialog: DialogOptions;
  onChoose: (action: DialogAction) => void;
  onDismiss: () => void;
}) {
  const { colors, radii, spacing } = useAppTheme();
  const tone = dialog.tone ?? 'primary';
  const tile = {
    primary: { background: colors.primarySoft, icon: colors.primaryInk },
    danger: { background: colors.dangerSoft, icon: colors.danger },
    gold: { background: colors.accentSoft, icon: colors.accentInk },
  }[tone];
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.layer}>
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="dialog-scrim"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onDismiss}
        />
        <View
          accessibilityViewIsModal
          testID="dialog"
          style={[styles.card, { backgroundColor: colors.surface, borderRadius: radii.xl }]}
        >
          <ScrollView
            style={styles.scroll}
            bounces={false}
            contentContainerStyle={{
              paddingTop: 22,
              paddingHorizontal: 20,
              paddingBottom: 18,
              gap: spacing.sm + 2,
            }}
          >
            <View
              style={[
                styles.tile,
                { backgroundColor: tile.background, borderRadius: radii.md, marginBottom: 2 },
              ]}
            >
              <Icon name={dialog.icon} size={24} color={tile.icon} />
            </View>
            <AppText variant="title" accessibilityRole="header" style={styles.title}>
              {dialog.title}
            </AppText>
            {dialog.body ? (
              <AppText tone="muted" style={styles.body}>
                {dialog.body}
              </AppText>
            ) : null}
            {dialog.content}
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {dialog.actions.map((action, i) => (
                <Button
                  key={action.label}
                  title={action.label}
                  kind={action.kind ?? (i === 0 ? 'primary' : 'secondary')}
                  destructive={action.destructive}
                  onPress={() => onChoose(action)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** A chapter name inside a dialog title: bold and teal, no «» (redesign). */
export function DialogName({ children }: { children: string }) {
  return (
    <AppText variant="title" tone="primaryInk">
      {children}
    </AppText>
  );
}

/**
 * Splits a translated sentence around a name (e.g. «حذف {{title}}؟»), so the name can be
 * drawn in its own style. `t` must be called with `{ [key]: NAME_MARK }`.
 */
export const NAME_MARK = '⁣';

export function aroundName(sentence: string): [string, string] {
  const at = sentence.indexOf(NAME_MARK);
  if (at < 0) return [sentence, ''];
  return [sentence.slice(0, at), sentence.slice(at + NAME_MARK.length)];
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used inside <DialogProvider>');
  return api;
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  card: {
    width: '100%',
    maxHeight: '86%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  tile: {
    width: 52,
    height: 52,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center', alignSelf: 'stretch', fontFamily: UI_FONTS.semibold },
  body: { textAlign: 'center', alignSelf: 'stretch', fontSize: 15, lineHeight: 26 },
});
