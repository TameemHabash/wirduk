import {
  DEFAULT_WARD_TIMES,
  type WardTimes,
  validWardTimes,
} from '@/features/adwamuha/logic/sessions';
import { WARD_ORDERS, type WardOrder } from '@/features/adwamuha/logic/ward';
import { DEFAULT_WEEK_START, type Weekday } from '@/features/adwamuha/logic/weeks';
import { DEFAULT_DHIKR_FONT_ID, isDhikrFontId } from '@/theme/fonts';
import type { ThemePreference } from '@/theme/resolve';

export interface ReminderSetting {
  enabled: boolean;
  /** Local time, "HH:MM" (24h). */
  time: string;
}

/** Every user setting, with its type. Stored as JSON in the user database. */
export interface AppSettings {
  theme: ThemePreference;
  /** Light tap on each count. */
  hapticsEnabled: boolean;
  /** Long vibration when a whole category is finished. */
  completionVibration: boolean;
  /** Medium vibration when the reader moves on to the next dhikr. */
  nextDhikrVibration: boolean;
  /** Keep the screen on while the reader is open. */
  keepScreenOn: boolean;
  /** Reopen the reader where the user stopped (with the counts), up to 5 hours later. */
  restoreSession: boolean;
  /** Short tick sound on each count. */
  tickSound: boolean;
  /** Dhikr text size in dp. */
  dhikrFontSize: number;
  /** Id of the dhikr text font (see DHIKR_FONTS). */
  dhikrFont: string;
  backgroundPlayback: boolean;
  autoplayNext: boolean;
  /** Each finished play of a recording counts once (the reader then moves on by itself). */
  audioCounts: boolean;
  morningReminder: ReminderSetting;
  eveningReminder: ReminderSetting;
  /** Adwamuha: when the morning and evening wards start, and until when they are on time. */
  wardTimes: WardTimes;
  /** Adwamuha: the ward in plan order (default) or in the category's order. */
  wardOrder: WardOrder;
  /** Adwamuha: the first day of every week (the settings screen offers four). */
  weekStart: Weekday;
}

export type SettingKey = keyof AppSettings;

export const DHIKR_FONT_SIZE = { min: 16, max: 40, step: 2, default: 24 } as const;

/** One step bigger (+1) or smaller (-1), kept inside the allowed range. */
export function stepFontSize(current: number, direction: 1 | -1): number {
  const next = current + direction * DHIKR_FONT_SIZE.step;
  return Math.min(DHIKR_FONT_SIZE.max, Math.max(DHIKR_FONT_SIZE.min, next));
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  hapticsEnabled: true,
  completionVibration: true,
  nextDhikrVibration: true,
  keepScreenOn: true,
  // Owner decision 2026-10-22: on by default.
  restoreSession: true,
  // Owner decision 2026-10-16: off by default (many read adhkar in quiet places).
  tickSound: false,
  dhikrFontSize: DHIKR_FONT_SIZE.default,
  dhikrFont: DEFAULT_DHIKR_FONT_ID,
  backgroundPlayback: true,
  autoplayNext: true,
  // Owner decision 2026-10-31: on by default (it was off since 2026-10-17, "the audio is for
  // listening"). A phone where the user set it keeps their choice.
  audioCounts: true,
  morningReminder: { enabled: false, time: '06:00' },
  eveningReminder: { enabled: false, time: '17:00' },
  // Adwamuha (prompt §5): 04:00, 12:00, 16:00, 00:00.
  wardTimes: DEFAULT_WARD_TIMES,
  // Owner decision 2026-10-29: plan order by default (recommended).
  wardOrder: 'plan',
  // Owner decision 2026-10-30: Saturday, whatever the phone's region says.
  weekStart: DEFAULT_WEEK_START,
};

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isTime = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const isReminder = (v: unknown): v is ReminderSetting =>
  typeof v === 'object' &&
  v !== null &&
  isBool((v as ReminderSetting).enabled) &&
  isTime((v as ReminderSetting).time);

/**
 * One validator per setting. A stored value that fails (old format, damaged
 * data) is ignored and the default is used instead.
 */
const VALIDATORS: { [K in SettingKey]: (v: unknown) => v is AppSettings[K] } = {
  theme: (v): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark',
  hapticsEnabled: isBool,
  completionVibration: isBool,
  nextDhikrVibration: isBool,
  keepScreenOn: isBool,
  restoreSession: isBool,
  tickSound: isBool,
  dhikrFontSize: (v): v is number =>
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v >= DHIKR_FONT_SIZE.min &&
    v <= DHIKR_FONT_SIZE.max,
  dhikrFont: isDhikrFontId,
  backgroundPlayback: isBool,
  autoplayNext: isBool,
  audioCounts: isBool,
  morningReminder: isReminder,
  eveningReminder: isReminder,
  wardTimes: (v): v is WardTimes => {
    if (typeof v !== 'object' || v === null) return false;
    const t = v as WardTimes;
    const all = [t.morningStart, t.morningOnTimeEnd, t.eveningStart, t.eveningOnTimeEnd];
    return all.every(isTime) && validWardTimes(t);
  },
  wardOrder: (v): v is WardOrder => WARD_ORDERS.includes(v as WardOrder),
  // Any day works (the settings screen offers four).
  weekStart: (v): v is Weekday => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 6,
};

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(VALIDATORS, key);
}

export function isValidSetting<K extends SettingKey>(
  key: K,
  value: unknown,
): value is AppSettings[K] {
  return VALIDATORS[key](value);
}

/** Builds full settings from stored raw JSON strings, falling back to defaults. */
export function settingsFromStored(rows: { key: string; json: string }[]): AppSettings {
  // Deep copy: callers may change the result without touching the defaults.
  const result = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
  for (const { key, json } of rows) {
    if (!isSettingKey(key)) continue;
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      continue;
    }
    if (isValidSetting(key, value)) {
      (result as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
