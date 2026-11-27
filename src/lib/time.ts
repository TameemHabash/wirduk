/** Reminder times are saved as "HH:MM" (24 hours), the way settings.ts checks them. */

/** "06:30" → { hour: 6, minute: 30 }. */
export function parseTime(time: string): { hour: number; minute: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  const hour = Number(m?.[1]);
  const minute = Number(m?.[2]);
  if (!m || hour > 23 || minute > 59) throw new Error(`Bad time: ${time}`);
  return { hour, minute };
}

/** { hour: 6, minute: 5 } → "06:05". */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** The time as people read it: 12 hours with ص / م, Western digits ("6:05 ص"). */
export function displayTime(time: string, am: string, pm: string): string {
  const { hour, minute } = parseTime(time);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? am : pm}`;
}
