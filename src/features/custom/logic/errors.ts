import type { TFunction } from 'i18next';

import { CustomContentError } from '@/data/repositories/custom-repository';

/** A user-facing message for a failed save; rethrows unexpected errors. */
export function customErrorMessage(t: TFunction, error: unknown): string {
  if (error instanceof CustomContentError) return t(`custom.errors.${error.code}`);
  throw error;
}
