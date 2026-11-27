import { Tabs } from 'expo-router/tabs';

import { useAppTheme } from '@/theme/ThemeProvider';

import { TabBar } from './TabBar';

/**
 * Three tabs (redesign, owner 2026-11-25): «الرئيسية», «الأذكار», «الإعدادات». Every other
 * screen (reader, finish, setup, editors, wards) is pushed above them, with no tab bar.
 */
export function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar state={props.state} navigation={props.navigation} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="adhkar" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
