import { Paths } from 'expo-file-system';

/** Free storage on the phone in bytes, or null when the system does not say. */
export function freeStorageBytes(): number | null {
  try {
    const bytes = Paths.availableDiskSpace;
    return Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
  } catch {
    return null;
  }
}
