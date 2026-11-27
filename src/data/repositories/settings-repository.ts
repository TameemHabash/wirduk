import type { SqlDatabase } from '../db/sql';
import {
  type AppSettings,
  type SettingKey,
  isValidSetting,
  settingsFromStored,
} from '../settings/settings';

/** User settings, stored as JSON per key. */
export class SettingsRepository {
  private readonly db: SqlDatabase;

  constructor(db: SqlDatabase) {
    this.db = db;
  }

  /** All settings. Missing or invalid stored values fall back to defaults. */
  async getAll(): Promise<AppSettings> {
    const rows = await this.db.getAll<{ key: string; json: string }>(
      'SELECT Key AS key, Value AS json FROM Settings',
    );
    return settingsFromStored(rows);
  }

  async set<K extends SettingKey>(key: K, value: AppSettings[K]): Promise<void> {
    if (!isValidSetting(key, value)) {
      throw new Error(`Invalid value for setting "${key}": ${JSON.stringify(value)}`);
    }
    await this.db.run('INSERT OR REPLACE INTO Settings (Key, Value) VALUES (?, ?)', [
      key,
      JSON.stringify(value),
    ]);
  }

  async reset(key: SettingKey): Promise<void> {
    await this.db.run('DELETE FROM Settings WHERE Key = ?', [key]);
  }
}
