import { createContext } from 'react';

/** What the reader lets its pages do (the pages are memoized and get only their dhikr). */
export interface ReaderActions {
  /** "عرض في الدرر السنية" was tapped: count, and offer to open Dorar. */
  onDorarPress: (url: string) => void;
}

export const ReaderActionsContext = createContext<ReaderActions | null>(null);
