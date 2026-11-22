import Constants from 'expo-constants';

import type { UserPlanStep } from './logic/types';
import { OWNER_TEXTS } from './owner-texts';

/**
 * The setup screens show on the first launch and once after each app update,
 * while «أدومها» is off (owner, 2026-10-29). Each app version (name and build
 * number) gets its own "shown" key in user.db, so a new version shows them
 * again and «لاحقًا» hides them until the next one.
 */
export function setupShownKey(): string {
  const config = Constants.expoConfig;
  return `setup:${config?.version ?? ''}+${config?.android?.versionCode ?? ''}`;
}

/**
 * The first words of a dhikr, for a short preview (design: «أول كلمات كل ذكر»,
 * from the database, never typed).
 */
export function firstWords(text: string, count = 3): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return words.join(' ');
  // No comma or full stop left before the «…».
  return `${words
    .slice(0, count)
    .join(' ')
    .replace(/[،,.؛;:]+$/, '')}…`;
}

const WARD_NAMES: Readonly<Record<string, string>> = OWNER_TEXTS.wardNames;

/**
 * How a dhikr shows in a ward preview: its first words, or the owner's name
 * for it (2026-10-30: «آية الكرسي», «الإخلاص والمعوذتين»).
 */
export function dhikrLabel(id: number, text: string, count = 3): string {
  return WARD_NAMES[String(id)] ?? firstWords(text, count);
}

/** The ward(s) a plan step adds its dhikr to. */
export function stepSession(step: UserPlanStep): 'both' | 'morning' | 'evening' {
  if (step.morningDhikrId !== null && step.eveningDhikrId !== null) return 'both';
  return step.morningDhikrId !== null ? 'morning' : 'evening';
}

/**
 * A plan step by its dhikr: the first 6 words or the owner's name («عدّل الخطة»,
 * «ارجع إلى الخطوة:»). `texts`: from `useDhikrTexts`.
 */
export function stepLabel(step: UserPlanStep, texts: ReadonlyMap<number, string>): string {
  const id = step.morningDhikrId ?? step.eveningDhikrId!;
  return dhikrLabel(id, texts.get(id) ?? '', 6);
}
