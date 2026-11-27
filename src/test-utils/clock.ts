/** Test-only: a clock that moves forward 1 ms on every call (for repositories that stamp times). */
export function fakeClock(start = 1_000): () => number {
  let t = start;
  return () => t++;
}
