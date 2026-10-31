import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { openAppDatabases } from './db/open-databases';
import { AdwamuhaRepository } from './repositories/adwamuha-repository';
import { BackupRepository } from './repositories/backup-repository';
import { ContentRepository } from './repositories/content-repository';
import { CustomRepository } from './repositories/custom-repository';
import {
  CategoryOrderRepository,
  DownloadedAudioRepository,
  FavoritesRepository,
  SessionRepository,
  SettingsRepository,
} from './repositories/user-repositories';

/** Every repository the UI can use. */
export interface Repositories {
  content: ContentRepository;
  favorites: FavoritesRepository;
  categoryOrder: CategoryOrderRepository;
  settings: SettingsRepository;
  downloadedAudio: DownloadedAudioRepository;
  custom: CustomRepository;
  session: SessionRepository;
  adwamuha: AdwamuhaRepository;
  backup: BackupRepository;
}

const DataContext = createContext<Repositories | null>(null);
const RestartContext = createContext<() => void>(() => undefined);

type State =
  | { status: 'loading' }
  | { status: 'ready'; repos: Repositories }
  | { status: 'error'; error: Error };

interface Props {
  children: ReactNode;
  /** Shown if the databases cannot be opened. */
  renderError: (error: Error, retry: () => void) => ReactNode;
}

/**
 * Opens the databases once and provides the repositories.
 * Renders nothing while loading (the splash screen is still visible).
 */
export function DataProvider({ children, renderError }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    openAppDatabases()
      .then(({ content, user }) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          repos: {
            content: new ContentRepository(content),
            favorites: new FavoritesRepository(user),
            categoryOrder: new CategoryOrderRepository(user),
            settings: new SettingsRepository(user),
            downloadedAudio: new DownloadedAudioRepository(user),
            custom: new CustomRepository(user),
            session: new SessionRepository(user),
            adwamuha: new AdwamuhaRepository(user),
            backup: new BackupRepository(user),
          },
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  // After a restore: every provider and screen below starts again and reads the new data.
  const [generation, setGeneration] = useState(0);
  const restart = useCallback(() => setGeneration((n) => n + 1), []);

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <>{renderError(state.error, retry)}</>;
  return (
    <DataContext.Provider value={state.repos}>
      <RestartContext.Provider value={restart}>
        <Fragment key={generation}>{children}</Fragment>
      </RestartContext.Provider>
    </DataContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const repos = useContext(DataContext);
  if (!repos) throw new Error('useRepositories must be used inside <DataProvider>');
  return repos;
}

/**
 * Starts the whole app again on the same databases (navigation back to Home,
 * every provider reloaded), e.g. after the user's data was replaced.
 */
export function useRestartApp(): () => void {
  return useContext(RestartContext);
}

/** For tests and previews: provide ready-made repositories. */
export function RepositoriesProvider({
  repos,
  children,
}: {
  repos: Repositories;
  children: ReactNode;
}) {
  return <DataContext.Provider value={repos}>{children}</DataContext.Provider>;
}
