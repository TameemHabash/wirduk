import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useRepositories } from '../DataProvider';

import { DEFAULT_SETTINGS, type AppSettings, type SettingKey } from './settings';

interface SettingsContextValue {
  settings: AppSettings;
  /** Updates the setting at once in the UI, then saves it. */
  update: <K extends SettingKey>(key: K, value: AppSettings[K]) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Loads settings once, then keeps them in memory and saves every change. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { settings: repo } = useRepositories();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo
      .getAll()
      .then((s) => !cancelled && setSettings(s))
      // A read failure must not block the app: use the defaults.
      .catch(() => !cancelled && setSettings({ ...DEFAULT_SETTINGS }));
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const update = useCallback(
    async <K extends SettingKey>(key: K, value: AppSettings[K]) => {
      setSettings((s) => (s ? { ...s, [key]: value } : s));
      await repo.set(key, value);
    },
    [repo],
  );

  const value = useMemo(() => (settings ? { settings, update } : null), [settings, update]);

  // Render nothing until loaded (the splash screen is still visible).
  if (!value) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
