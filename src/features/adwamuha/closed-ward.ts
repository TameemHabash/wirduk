import type { TFunction } from 'i18next';

import { displayTime } from '@/features/reminders/reminder-time';

import type { Session, WardTimes } from './logic/sessions';

/**
 * The note when a ward cannot be opened now (owner's choice, 2026-11-21): «انتهى وقت ورد
 * الصباح.», or «يبدأ ورد الصباح الساعة …» for a reminder set before the ward begins. The time
 * comes from the ward times in the settings.
 */
export function closedWardText(
  t: TFunction,
  session: Session,
  reason: 'over' | 'notYet',
  times: WardTimes,
): string {
  if (reason === 'over') return t(`adwamuha.wardOver.${session}`);
  return t('adwamuha.startsAt', {
    ward: t(`adwamuha.wardTitle.${session}`),
    time: displayTime(
      session === 'morning' ? times.morningStart : times.eveningStart,
      t('settings.am'),
      t('settings.pm'),
    ),
  });
}
