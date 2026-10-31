import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  /** Screens under a native header only need the bottom edge. */
  edges?: Edge[];
}

/** Page container with theme background and safe-area padding. */
export function Screen({ children, scroll = false, edges = ['bottom'] }: Props) {
  const { colors, spacing } = useAppTheme();
  const content = scroll ? (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, { padding: spacing.lg, gap: spacing.lg }]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
