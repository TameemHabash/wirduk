package expo.modules.wirdukbackup

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Tells the app when Android last backed it up (see WirdukBackupAgent), and opens its settings. */
class WirdukBackupModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WirdukBackup")

    // Milliseconds since 1970, or null when Android never backed up this install's data.
    Function("lastAutoBackupAt") {
      val context = appContext.reactContext ?: return@Function null
      val at = context
        .getSharedPreferences(WirdukBackupAgent.PREFS, Context.MODE_PRIVATE)
        .getLong(WirdukBackupAgent.LAST_BACKUP_AT, 0L)
      if (at > 0L) at.toDouble() else null
    }

    // Opens the phone's backup settings so the user can turn backup on (an app cannot turn it
    // on itself, nor ask whether it is on). Google's backup screen first (every phone with
    // Google Play services; Samsung does not handle stock Android's, owner 2026-10-29), then
    // stock Android's, then the main Settings. Returns "backup", "settings" or "none".
    AsyncFunction("openBackupSettings") {
      val activity = appContext.currentActivity
      val context: Context = activity ?: appContext.reactContext ?: return@AsyncFunction "none"
      fun open(action: String): Boolean =
        try {
          val intent = Intent(action)
          if (activity == null) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
          true
        } catch (e: ActivityNotFoundException) {
          false
        } catch (e: SecurityException) {
          false
        }
      when {
        open(GOOGLE_BACKUP_SETTINGS) -> "backup"
        open(BACKUP_SETTINGS) -> "backup"
        open(Settings.ACTION_SETTINGS) -> "settings"
        else -> "none"
      }
    }.runOnQueue(Queues.MAIN)
  }

  companion object {
    /**
     * Google's backup screen in Google Play services ("Backup & reset" with the account, one tap
     * to Google's backup page; .backup.component.BackupSettingsCollapsingActivity).
     */
    const val GOOGLE_BACKUP_SETTINGS = "com.google.android.gms.backup.ACTION_BACKUP_SETTINGS"

    /** Stock Android's backup screen (com.android.settings .backup.UserBackupSettingsActivity). */
    const val BACKUP_SETTINGS = "com.android.settings.BACKUP_SETTINGS"
  }
}
