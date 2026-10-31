/**
 * Test-only: render a screen with the app's providers and REAL repositories
 * (the shipped content database + a fresh in-memory user database).
 */
import type { ReactElement } from 'react';
import { act, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { RepositoriesProvider, type Repositories } from '@/data/DataProvider';
import { AdwamuhaRepository } from '@/data/repositories/adwamuha-repository';
import { BackupRepository } from '@/data/repositories/backup-repository';
import { ContentRepository } from '@/data/repositories/content-repository';
import { CustomRepository } from '@/data/repositories/custom-repository';
import {
  CategoryOrderRepository,
  DownloadedAudioRepository,
  FavoritesRepository,
  SessionRepository,
  SettingsRepository,
} from '@/data/repositories/user-repositories';
import { SettingsProvider } from '@/data/settings/SettingsProvider';
import { AdwamuhaProvider } from '@/features/adwamuha/AdwamuhaProvider';
import type { Weekday } from '@/features/adwamuha/logic/weeks';
import { setupShownKey } from '@/features/adwamuha/setup';
import { AudioProvider } from '@/features/audio/AudioProvider';
import type { ThemePreference } from '@/theme/resolve';
import { AppThemeProvider } from '@/theme/ThemeProvider';

import { createUserDb, openShippedContentDb } from './databases';

/**
 * `newInstall`: the user database of a first launch. By default the tests act
 * as an existing install, where Adwamuha's setup was already seen for this version.
 */
export async function createTestRepositories({
  newInstall = false,
}: { newInstall?: boolean } = {}): Promise<Repositories> {
  const content = openShippedContentDb();
  const user = await createUserDb();
  if (!newInstall) {
    await user.run('INSERT OR IGNORE INTO AdwamuhaShown (Key, At) VALUES (?, 0)', [
      setupShownKey(),
    ]);
  }
  return {
    content: new ContentRepository(content),
    favorites: new FavoritesRepository(user),
    categoryOrder: new CategoryOrderRepository(user),
    settings: new SettingsRepository(user),
    downloadedAudio: new DownloadedAudioRepository(user),
    custom: new CustomRepository(user),
    session: new SessionRepository(user),
    adwamuha: new AdwamuhaRepository(user),
    backup: new BackupRepository(user),
  };
}

export interface RenderOptions {
  /** Adwamuha's clock (default: the real time). */
  now?: () => Date;
  /**
   * «بداية الأسبوع», saved in the user database before rendering (default: the setting's own
   * default, Saturday). Any day works, not only the four the screen offers.
   */
  weekStartsOn?: Weekday;
  /** The theme (default: the system's, light in tests). */
  theme?: ThemePreference;
}

export async function renderWithApp(
  ui: ReactElement,
  repos?: Repositories,
  options: RenderOptions = {},
) {
  const repositories = repos ?? (await createTestRepositories());
  if (options.weekStartsOn !== undefined) {
    await repositories.settings.set('weekStart', options.weekStartsOn);
  }
  const result = await render(
    <SafeAreaProvider>
      <AppThemeProvider initialPreference={options.theme}>
        <RepositoriesProvider repos={repositories}>
          <SettingsProvider>
            <AdwamuhaProvider now={options.now}>
              <AudioProvider>
                <ToastProvider>{ui}</ToastProvider>
              </AudioProvider>
            </AdwamuhaProvider>
          </SettingsProvider>
        </RepositoriesProvider>
      </AppThemeProvider>
    </SafeAreaProvider>,
  );
  return { ...result, repos: repositories };
}

/**
 * Lists render more rows on their own 50 ms timer (tests have no layout).
 * After changing a list's data at the end of a test, call this so that render
 * happens inside act() and not after the test, where React warns about it.
 */
export async function settleLists(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 120)));
}
