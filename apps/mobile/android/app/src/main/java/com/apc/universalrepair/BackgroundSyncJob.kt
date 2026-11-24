package com.apc.universalrepair

import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener

/**
 * Syncs the phone's copy of the inventory while the app is out of sight (see src/features/inventory/backgroundSync.ts):
 * every 15 minutes or so, with a network, Android's JobScheduler runs this job, which starts the BACKGROUND_SYNC_TASK
 * in the app's JavaScript as a headless task, as React Native's HeadlessJsTaskService does, so its timers and requests
 * run with no screen. The task syncs the copy and shows in the shade what it brought that needs the user. It doesn't
 * run while the app is in the foreground, which syncs on its own, and ends the job once done, or after TIMEOUT_MS.
 */
class BackgroundSyncJob : JobService(), HeadlessJsTaskEventListener {
  /** The job running, to end once its task does. */
  private var running: JobParameters? = null
  /** The task started for it, if any. */
  private var taskId: Int? = null
  /** The context the task runs in, to stop listening to it. */
  private var taskContext: ReactContext? = null

  override fun onStartJob(params: JobParameters): Boolean {
    running = params
    val host = (application as ReactApplication).reactHost ?: return false
    val context = host.currentReactContext
    if (context != null) {
      start(context)
    } else {
      host.addReactInstanceEventListener(
        object : ReactInstanceEventListener {
          override fun onReactContextInitialized(context: ReactContext) {
            host.removeReactInstanceEventListener(this)
            start(context)
          }
        },
      )
      host.start()
    }
    return true
  }

  override fun onStopJob(params: JobParameters): Boolean {
    stopListening()
    return false
  }

  override fun onHeadlessJsTaskStart(taskId: Int) {}

  override fun onHeadlessJsTaskFinish(taskId: Int) {
    if (taskId == this.taskId) {
      finish()
    }
  }

  /**
   * Starts the task in the app's JavaScript, unless the app is in the foreground.
   * @param context The app's React context.
   */
  private fun start(context: ReactContext) {
    UiThreadUtil.runOnUiThread {
      val tasks = HeadlessJsTaskContext.getInstance(context)
      try {
        taskContext = context
        tasks.addTaskEventListener(this)
        taskId = tasks.startTask(HeadlessJsTaskConfig(BACKGROUND_SYNC_TASK, Arguments.createMap(), TIMEOUT_MS, false))
      } catch (error: IllegalStateException) {
        // The app is in the foreground, which syncs on its own.
        finish()
      }
    }
  }

  /** Ends the job, and stops listening to its task. */
  private fun finish() {
    stopListening()
    running?.let { jobFinished(it, false) }
    running = null
  }

  /** Stops listening to the task. */
  private fun stopListening() {
    taskContext?.let { HeadlessJsTaskContext.getInstance(it).removeTaskEventListener(this) }
    taskContext = null
    taskId = null
  }

  companion object {
    /** The headless task's name, which the app's JavaScript registers (index.js). */
    const val BACKGROUND_SYNC_TASK = "ApcBackgroundSync"
    /** The job's id in the JobScheduler. */
    private const val JOB_ID = 4190
    /** How often Android runs the job, at most, in ms: the least it allows. */
    private const val PERIOD_MS = 15 * 60_000L
    /** How long the task may take before it is stopped, in ms. */
    private const val TIMEOUT_MS = 60_000L

    /**
     * Schedules the job, every PERIOD_MS with a network, unless it already is, so starting the app doesn't put it off.
     * @param context The app's context.
     */
    fun schedule(context: Context) {
      val scheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
      if (scheduler.getPendingJob(JOB_ID) != null) {
        return
      }
      val job =
        JobInfo.Builder(JOB_ID, ComponentName(context, BackgroundSyncJob::class.java))
          .setPeriodic(PERIOD_MS)
          .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
          .build()
      scheduler.schedule(job)
    }
  }
}
