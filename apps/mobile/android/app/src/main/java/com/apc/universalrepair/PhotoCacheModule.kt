package com.apc.universalrepair

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.network.OkHttpClientProvider
import java.io.File
import java.io.IOException
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Request
import okhttp3.Response

/**
 * The item photos the phone keeps to show away from the server (see src/features/inventory/photoCache.ts, as
 * NativeModules.PhotoCache): thumbnails and full photos, each kind in a folder of its own under the app's no-backup
 * storage, out of reach of other apps, each file named after its photo's id, as a photo's id never changes while its
 * file doesn't. A photo is downloaded through React Native's OkHttp client, which pins the paired server's certificate
 * (see ServerPin.kt), off JavaScript's thread, into a temporary file renamed once complete. A file's last change is its
 * last use, so the oldest are dropped first when a kind keeps more than its limit.
 */
class PhotoCacheModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  /**
   * Lists the photos kept.
   * @param promise Resolved with { thumb: { id: address }, full: { id: address } }.
   */
  @ReactMethod
  fun list(promise: Promise) {
    val result = Arguments.createMap()
    for (kind in KINDS) {
      val files = Arguments.createMap()
      files(kind).forEach { files.putString(it.name, it.toURI().toString()) }
      result.putMap(kind, files)
    }
    promise.resolve(result)
  }

  /**
   * Downloads a photo and keeps it.
   * @param kind "thumb" or "full".
   * @param id The photo's id, which names its file.
   * @param url Where the server serves it, signed for the session.
   * @param promise Resolved with the file's address, or rejected when it couldn't be downloaded.
   */
  @ReactMethod
  fun save(kind: String, id: String, url: String, promise: Promise) {
    val file = fileOf(kind, id)
    val request = file?.let { Request.Builder().url(url).build() }
    if (request == null) {
      promise.reject("photo_cache", "Not a photo: $kind $id")
      return
    }
    OkHttpClientProvider.getOkHttpClient().newCall(request).enqueue(
      object : Callback {
        override fun onFailure(call: Call, error: IOException) = promise.reject("photo_cache", error)

        override fun onResponse(call: Call, response: Response) {
          response.use {
            if (!it.isSuccessful) {
              promise.reject("photo_cache", "HTTP ${it.code}")
              return
            }
            try {
              val part = File(file.parentFile, "$id.part")
              part.outputStream().use { out -> it.body!!.byteStream().copyTo(out) }
              if (!part.renameTo(file)) {
                part.delete()
                throw IOException("Couldn't keep $id")
              }
              promise.resolve(file.toURI().toString())
            } catch (error: Exception) {
              promise.reject("photo_cache", error)
            }
          }
        }
      },
    )
  }

  /**
   * Marks photos as just used, so they are the last dropped.
   * @param kind "thumb" or "full".
   * @param ids The photos' ids.
   */
  @ReactMethod
  fun touch(kind: String, ids: ReadableArray) {
    val now = System.currentTimeMillis()
    for (index in 0 until ids.size()) {
      fileOf(kind, ids.getString(index) ?: continue)?.setLastModified(now)
    }
  }

  /**
   * Drops photos.
   * @param kind "thumb" or "full".
   * @param ids The photos' ids.
   * @param promise Resolved once they are gone.
   */
  @ReactMethod
  fun remove(kind: String, ids: ReadableArray, promise: Promise) {
    for (index in 0 until ids.size()) {
      fileOf(kind, ids.getString(index) ?: continue)?.delete()
    }
    promise.resolve(null)
  }

  /**
   * Drops the least recently used photos of a kind until the rest fit in a size.
   * @param kind "thumb" or "full".
   * @param maxBytes The most the kind may keep, in bytes.
   * @param promise Resolved with the ids dropped.
   */
  @ReactMethod
  fun trim(kind: String, maxBytes: Double, promise: Promise) {
    val kept = files(kind).sortedByDescending { it.lastModified() }
    var total = 0L
    val dropped = Arguments.createArray()
    for (file in kept) {
      total += file.length()
      if (total > maxBytes && file.delete()) {
        dropped.pushString(file.name)
      }
    }
    promise.resolve(dropped)
  }

  /**
   * Drops every photo kept.
   * @param promise Resolved once they are gone.
   */
  @ReactMethod
  fun clear(promise: Promise) {
    File(context.noBackupFilesDir, FOLDER).deleteRecursively()
    promise.resolve(null)
  }

  /** The folder of a kind of photo, made the first time; null for anything but the kinds kept. */
  private fun folder(kind: String): File? =
    if (kind in KINDS) File(File(context.noBackupFilesDir, FOLDER), kind).apply { mkdirs() } else null

  /** A photo's file, by its id; null for an id that could reach out of its folder. */
  private fun fileOf(kind: String, id: String): File? = if (ID.matches(id)) folder(kind)?.let { File(it, id) } else null

  /** The photos kept of a kind, without the ones still downloading. */
  private fun files(kind: String): List<File> = folder(kind)?.listFiles()?.filter { !it.name.endsWith(".part") } ?: emptyList()

  companion object {
    /** The name JavaScript reaches the module by, as NativeModules.PhotoCache. */
    const val NAME = "PhotoCache"

    /** The folder the photos are kept in, under the no-backup storage. */
    private const val FOLDER = "photos"
    /** The kinds of photos kept, each in its own folder. */
    private val KINDS = listOf("thumb", "full")
    /** What a photo's id is made of, so it names a file in its folder and nothing else. */
    private val ID = Regex("[A-Za-z0-9-]+")
  }
}
