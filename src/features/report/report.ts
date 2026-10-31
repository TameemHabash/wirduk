import { Dimensions, PixelRatio, Platform } from 'react-native';
import Constants from 'expo-constants';

import { APP_CONFIG } from '@/config/app-config';
import type { AppSettings } from '@/data/settings/settings';

import {
  DETAIL_KEYS,
  REPORT_LIMITS,
  type Report,
  type ReportDetails,
  type ReportError,
} from './report-protocol';

/** "12.3 GB" (one decimal), or "850 MB" below 1 GB. */
export function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

/** "1080×2400 px (412×915 dp)": layout bugs depend on both. */
export function formatScreen(width: number, height: number, scale: number): string {
  const px = `${Math.round(width * scale)}×${Math.round(height * scale)} px`;
  return `${px} (${Math.round(width)}×${Math.round(height)} dp)`;
}

/** The app and device details, as the user sees them before sending. Nothing personal. */
export function collectDetails(
  settings: AppSettings,
  scheme: 'light' | 'dark',
  language: string,
  freeBytes: number | null,
): ReportDetails {
  const constants = Platform.constants as unknown as Record<string, unknown>;
  const android = Platform.OS === 'android';
  const screen = Dimensions.get('screen');
  const details: ReportDetails = {
    appVersion: Constants.expoConfig?.version ?? '',
    contentVersion: String(APP_CONFIG.content.version),
    os: android
      ? `Android ${String(constants.Release)} (API ${Platform.Version})`
      : `${Platform.OS} ${Platform.Version}`,
    device: android ? `${String(constants.Manufacturer)} ${String(constants.Model)}` : '',
    screen: formatScreen(screen.width, screen.height, screen.scale),
    // The phone's own text size setting (100% = normal).
    fontScale: `${Math.round(PixelRatio.getFontScale() * 100)}%`,
    freeStorage: freeBytes === null ? '' : formatBytes(freeBytes),
    language,
    theme: settings.theme === 'system' ? `system (${scheme})` : settings.theme,
    dhikrFont: settings.dhikrFont,
    dhikrFontSize: String(settings.dhikrFontSize),
  };
  // Same order as DETAIL_KEYS, no empty values, never longer than the relay accepts.
  const clean: ReportDetails = {};
  for (const key of DETAIL_KEYS) {
    const value = details[key];
    if (value) clean[key] = value.slice(0, REPORT_LIMITS.maxDetailChars);
  }
  return clean;
}

export type SendResult = { ok: true } | { ok: false; error: ReportError | 'offline' };

const KNOWN_ERRORS: readonly string[] = [
  'invalid',
  'too-big',
  'rate-limited',
  'unavailable',
  'failed',
] satisfies ReportError[];

/** Sends the report to the relay. Never throws: the result says what went wrong. */
export async function sendReport(
  endpoint: string,
  report: Report,
  fetchFn: typeof fetch = fetch,
): Promise<SendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), APP_CONFIG.report.timeoutMs);
  let res: Response;
  try {
    res = await fetchFn(`${endpoint.replace(/\/$/, '')}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      signal: controller.signal,
    });
  } catch {
    return { ok: false, error: 'offline' };
  } finally {
    clearTimeout(timer);
  }
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (typeof body?.error === 'string' && KNOWN_ERRORS.includes(body.error)) {
    return { ok: false, error: body.error as ReportError };
  }
  if (res.status === 429) return { ok: false, error: 'rate-limited' };
  if (res.status === 413) return { ok: false, error: 'too-big' };
  return { ok: false, error: 'failed' };
}
