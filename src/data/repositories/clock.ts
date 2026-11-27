/** The time now, in ms since 1970. Repositories take one so tests can fix the time. */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
