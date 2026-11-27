/**
 * Test-only: the reader as the user meets it. Open it at a dhikr, tap the
 * counter, and check what it says (the counter's label is what TalkBack reads).
 */
import { fireEvent, screen } from '@testing-library/react-native';

import type { Repositories } from '@/data/DataProvider';
import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';
import { counterStore } from '@/features/reader/state/counter-store';

import { setRouteParams } from './mocks/router';
import { createTestRepositories, renderWithApp } from './render-app';
import { tr, trPattern } from './tr';

/** The counter: its label says the count («تم 2 من 3»). */
export const counter = () => screen.getByLabelText(trPattern('reader.counter'));

/** The counter's label for `done` of `total`. */
export const counted = (done: number, total: number) => tr('reader.counter', { done, total });

/** The page's place in the chapter («2 من 24»). */
export const position = (current: number, total: number) =>
  tr('reader.position', { current, total });

/** One tap on the counter (an accessibility "activate" is one tap). */
export const tapCounter = () =>
  fireEvent(counter(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

export interface OpenReader {
  /** The repositories to use (default: new ones). */
  repos?: Repositories;
  /** Runs before the screen opens (e.g. a setting). */
  setup?: (repos: Repositories) => Promise<unknown>;
}

/**
 * Opens the reader at `dhikrId` (shipped content: its chapter is `id ÷ 1000`), with
 * every count of the chapter at zero. Waits for the counter.
 */
export async function openReader(dhikrId: number, options: OpenReader = {}) {
  return open(Math.floor(dhikrId / 1000), dhikrId, options);
}

/** Opens the reader at the start of a chapter of the shipped content. */
export async function openChapter(categoryId: number, options: OpenReader = {}) {
  return open(categoryId, undefined, options);
}

async function open(categoryId: number, dhikrId: number | undefined, { repos, setup }: OpenReader) {
  const r = repos ?? (await createTestRepositories());
  await setup?.(r);
  const adhkar = await r.content.listAdhkar(categoryId, 'ar');
  counterStore.resetMany(adhkar.map((d) => d.id)); // counts are app-wide memory
  setRouteParams(
    dhikrId === undefined
      ? { id: String(categoryId) }
      : { id: String(categoryId), dhikr: String(dhikrId) },
  );
  const view = await renderWithApp(<ReaderScreen />, r);
  await screen.findByLabelText(trPattern('reader.counter'));
  /** The place of a dhikr of this chapter, as the reader shows it. */
  const placeOf = (id: number) => position(adhkar.findIndex((d) => d.id === id) + 1, adhkar.length);
  return { repos: r, adhkar, view, placeOf };
}
