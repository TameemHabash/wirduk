import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { useToastOffset } from '@/components/Toast';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

/** The three tabs (owner, 2026-11-25): their route names, icons and words. */
export const TABS = [
  { name: 'index', icon: 'home', label: 'tabs.home' },
  { name: 'adhkar', icon: 'book', label: 'search.adhkar' },
  { name: 'settings', icon: 'settings', label: 'settings.title' },
] as const satisfies readonly { name: string; icon: IconName; label: string }[];

/**
 * The tab bar (design `.tabs`): the icon in a soft pill when selected, the word under it.
 * While it shows, toasts sit above it.
 */
export function TabBar({ state, navigation }: Pick<BottomTabBarProps, 'state' | 'navigation'>) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  // The tab bar stays mounted under a screen pushed above the tabs: lift the toasts only
  // while the tabs are the screen in front.
  const [front, setFront] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFront(true);
      return () => setFront(false);
    }, []),
  );
  useToastOffset(front ? height : 0);

  return (
    <View
      accessibilityRole="tablist"
      testID="tab-bar"
      onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS.find((x) => x.name === route.name);
        if (!tab) return null;
        const selected = state.index === index;
        const color = selected ? colors.primaryInk : colors.textMuted;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={t(tab.label)}
            accessibilityState={{ selected }}
            onPress={onPress}
            style={styles.tab}
          >
            <View
              // A new view when selected: Android drew it square after its fill changed in place.
              key={selected ? 'on' : 'off'}
              style={[styles.pill, selected && { backgroundColor: colors.primarySoft }]}
            >
              <Icon name={tab.icon} size={22} color={color} />
            </View>
            <AppText
              style={[
                styles.label,
                { color, fontFamily: selected ? UI_FONTS.semibold : UI_FONTS.medium },
              ]}
            >
              {t(tab.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48 },
  pill: { width: 58, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  // The whole tab's width: never as narrow as Android measured the word (Galaxy).
  label: { fontSize: 12, lineHeight: 18, alignSelf: 'stretch', textAlign: 'center' },
});
