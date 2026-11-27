import { createContext } from 'react';

/** What the reader lets its pages do (the pages are memoized and get only their dhikr). */
export interface ReaderActions {
  /** "عرض في الدرر السنية" was tapped: count, and offer to open Dorar. */
  onDorarPress: (url: string) => void;
  /** «المصدر» was tapped: it counts like any tap (owner, 2026-11-26); the page opens it. */
  onSourcePress: () => void;
}

export const ReaderActionsContext = createContext<ReaderActions | null>(null);
