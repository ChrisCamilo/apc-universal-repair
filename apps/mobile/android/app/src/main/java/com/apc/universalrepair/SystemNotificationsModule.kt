package com.apc.universalrepair

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * The app's notifications in the Android shade (see src/features/notifications/systemNotifications.ts, as
 * NativeModules.SystemNotifications): local ones, with no push server, on the app's channel, named in the language
 * chosen ("Notificações do APC"), made the first time one is shown and renamed when the language changes. Each opens
 * the app on OPEN_URL, which the app reads as a link and opens the bell's notifications for, and goes away once tapped. Without the notification permission (Android 13 and later) or with the
 * app's notifications turned off, Android shows nothing and nothing fails.
 */
class SystemNotificationsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  /**
   * Shows a notification in the shade.
   * @param title Its title, e.g. "Aviso".
   * @param message Its text.
   * @param channel The channel's name in the language chosen, e.g. "Notificações do APC".
   * @param promise Resolved once handed to Android.
   */
  @ReactMethod
  fun show(title: String, message: String, channel: String, promise: Promise) {
    try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (!manager.areNotificationsEnabled()) {
        promise.resolve(null)
        return
      }
      val builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, channel, NotificationManager.IMPORTANCE_DEFAULT))
          Notification.Builder(context, CHANNEL_ID)
        } else {
          @Suppress("DEPRECATION")
          Notification.Builder(context)
        }
      val open =
        Intent(context, MainActivity::class.java)
          .setAction(Intent.ACTION_VIEW)
          .setData(Uri.parse(OPEN_URL))
          .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      val notification =
        builder
          .setSmallIcon(R.drawable.ic_notification)
          .setContentTitle(title)
          .setContentText(message)
          .setStyle(Notification.BigTextStyle().bigText(message))
          .setContentIntent(PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
          .setAutoCancel(true)
          .build()
      manager.notify(nextId++, notification)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("system_notifications", error)
    }
  }

  /**
   * Names the channel in the language chosen, making it when it isn't there yet; Android keeps the user's settings of
   * it, as only its name changes. Before Android 8 there are no channels, and nothing happens.
   * @param channel The channel's name, e.g. "APC notifications".
   * @param promise Resolved once named.
   */
  @ReactMethod
  fun nameChannel(channel: String, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, channel, NotificationManager.IMPORTANCE_DEFAULT))
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("system_notifications", error)
    }
  }

  companion object {
    /** The name JavaScript reaches the module by, as NativeModules.SystemNotifications. */
    const val NAME = "SystemNotifications"

    /** The channel's id, which stays as its name changes with the language. */
    private const val CHANNEL_ID = "apc-notifications"
    /** What a tap opens the app on, which it reads as the bell's notifications. */
    private const val OPEN_URL = "apcuniversalrepair://notifications"
    /** The next notification's id, so each one stays in the shade. */
    private var nextId = 1
  }
}
