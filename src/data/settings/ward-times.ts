/**
 * The four ward times of «أدومها»'s settings ("HH:MM", 24 hours): when each ward begins and
 * until when it is on time. `features/adwamuha/logic/sessions.ts` turns them into windows.
 */
import type { WardTimes } from '@/data/models';
import { parseTime } from '@/lib/time';

export const DAY_MINUTES = 24 * 60;

const minutes = (time: string) => {
  const { hour, minute } = parseTime(time);
  return hour * 60 + minute;
};

/** The four times in minutes, the evening's end after the evening's start (it may pass midnight). */
export function wardBounds(times: WardTimes) {
  const ms = minutes(times.morningStart);
  const mo = minutes(times.morningOnTimeEnd);
  const es = minutes(times.eveningStart);
  let eo = minutes(times.eveningOnTimeEnd);
  if (eo <= es) eo += DAY_MINUTES;
  return { ms, mo, es, eo };
}

/**
 * Times make sense when: morning starts < morning on-time ends ≤ evening
 * starts < evening on-time ends ≤ the next morning start.
 */
export function validWardTimes(times: WardTimes): boolean {
  try {
    const { ms, mo, es, eo } = wardBounds(times);
    return ms < mo && mo <= es && es < eo && eo <= ms + DAY_MINUTES;
  } catch {
    return false;
  }
}
