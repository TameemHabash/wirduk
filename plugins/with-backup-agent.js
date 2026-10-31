/**
 * Android's automatic backup (to the user's own Google Drive), milestone 12:
 * the backup agent of modules/wirduk-backup (it records each backup's date)
 * and its rules (only user.db and that date; the 25 MB limit is never passed).
 * android/ is generated, so the manifest is changed here, never by hand.
 */
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withBackupAgent(config) {
  return withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    Object.assign(app.$, {
      'android:allowBackup': 'true',
      'android:fullBackupOnly': 'true',
      'android:backupAgent': 'expo.modules.wirdukbackup.WirdukBackupAgent',
      'android:fullBackupContent': '@xml/wirduk_backup_rules',
      'android:dataExtractionRules': '@xml/wirduk_data_extraction_rules',
    });
    return c;
  });
};
