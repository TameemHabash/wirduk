import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * A new pager each time its width changes (a rotation, split screen): the old one keeps its
 * scroll offset in pixels of the old width and stops between two pages. The key changes only
 * after the new width is measured, so the new pager is laid out at its final width.
 * `onRebuild` runs after each new pager (the old pager's events are gone with it).
 */
export function usePagerRebuild(onRebuild: () => void): {
  pagerKey: number;
  onPagerLayout: (e: LayoutChangeEvent) => void;
} {
  const pagerWidth = useRef(0);
  const [pagerKey, setPagerKey] = useState(0);
  const onPagerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (pagerWidth.current !== 0 && w !== pagerWidth.current) setPagerKey((g) => g + 1);
    pagerWidth.current = w;
  }, []);
  const rebuilt = useRef(onRebuild);
  useEffect(() => {
    rebuilt.current = onRebuild;
  });
  useEffect(() => {
    rebuilt.current();
  }, [pagerKey]);
  return { pagerKey, onPagerLayout };
}
