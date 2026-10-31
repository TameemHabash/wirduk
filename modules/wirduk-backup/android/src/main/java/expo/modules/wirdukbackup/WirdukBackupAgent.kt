package expo.modules.wirdukbackup

import android.app.backup.BackupAgent
import android.app.backup.BackupDataInput
import android.app.backup.BackupDataOutput
import android.app.backup.FullBackupDataOutput
import android.content.Context
import android.os.ParcelFileDescriptor

/**
 * Android's automatic backup (to the user's own Google Drive) calls this agent each time it
 * backs the app up. It saves the time, so the app can show when the data was last saved (an app
 * cannot ask Android whether backup is on), then lets Android copy the files that
 * res/xml/wirduk_backup_rules.xml and wirduk_data_extraction_rules.xml allow.
 *
 * Set in the app's manifest by plugins/with-backup-agent.js (android:fullBackupOnly="true").
 */
class WirdukBackupAgent : BackupAgent() {
  override fun onFullBackup(data: FullBackupDataOutput) {
    // Written first, so this backup carries its own date.
    getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putLong(LAST_BACKUP_AT, System.currentTimeMillis())
      .commit()
    super.onFullBackup(data)
  }

  // Key/value backup is not used: Android runs the full (file) backup above.
  override fun onBackup(
    oldState: ParcelFileDescriptor?,
    data: BackupDataOutput?,
    newState: ParcelFileDescriptor?,
  ) = Unit

  override fun onRestore(
    data: BackupDataInput?,
    appVersionCode: Int,
    newState: ParcelFileDescriptor?,
  ) = Unit

  companion object {
    /** SharedPreferences file (wirduk_backup.xml), included in the backup rules. */
    const val PREFS = "wirduk_backup"
    const val LAST_BACKUP_AT = "lastBackupAt"
  }
}
