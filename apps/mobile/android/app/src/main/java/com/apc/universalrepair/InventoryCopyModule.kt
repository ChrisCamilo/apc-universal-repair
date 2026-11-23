package com.apc.universalrepair

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * The phone's copy of the server's inventory on disk (see src/features/inventory/inventoryCopy.ts, as
 * NativeModules.InventoryCopy): one file in the app's own storage, out of reach of other apps and backups, encrypted
 * with AES-256-GCM under a key made in the Android Keystore on the first write, which never leaves it, not even to
 * the app. The file holds the IV's length, the IV and the ciphertext, and is replaced whole on each write, through a
 * temporary file, so a write cut short leaves the last copy. A file that doesn't decrypt (its key gone, after a
 * restore on another phone) reads as no copy, and the app copies the inventory again. Clearing deletes the file and
 * the key, so nothing of the copy can be read again; uninstalling the app deletes both too.
 */
class InventoryCopyModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  /**
   * Reads the copy.
   * @param promise Resolved with the copy as written, or null when there is none or it doesn't decrypt.
   */
  @ReactMethod
  fun read(promise: Promise) {
    val file = file()
    if (!file.baseFile.exists()) {
      promise.resolve(null)
      return
    }
    try {
      val bytes = file.readFully()
      val ivLength = bytes[0].toInt()
      val cipher = Cipher.getInstance(TRANSFORMATION).apply {
        init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_BITS, bytes, 1, ivLength))
      }
      promise.resolve(String(cipher.doFinal(bytes, 1 + ivLength, bytes.size - 1 - ivLength), Charsets.UTF_8))
    } catch (error: Exception) {
      file.delete()
      promise.resolve(null)
    }
  }

  /**
   * Replaces the copy.
   * @param copy The copy, as JSON.
   * @param promise Resolved once it is on disk.
   */
  @ReactMethod
  fun write(copy: String, promise: Promise) {
    val file = file()
    val stream = file.startWrite()
    try {
      val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
      val encrypted = cipher.doFinal(copy.toByteArray(Charsets.UTF_8))
      stream.write(byteArrayOf(cipher.iv.size.toByte()) + cipher.iv + encrypted)
      file.finishWrite(stream)
      promise.resolve(null)
    } catch (error: Exception) {
      file.failWrite(stream)
      promise.reject("inventory_copy", error)
    }
  }

  /**
   * Deletes the copy and its key.
   * @param promise Resolved once both are gone.
   */
  @ReactMethod
  fun clear(promise: Promise) {
    try {
      file().delete()
      keyStore().deleteEntry(ALIAS)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("inventory_copy", error)
    }
  }

  /** The copy's file, in the app's own storage. */
  private fun file() = AtomicFile(File(context.filesDir, FILE_NAME))

  companion object {
    /** The name JavaScript reaches the module by, as NativeModules.InventoryCopy. */
    const val NAME = "InventoryCopy"

    /** The key's name in the Keystore. */
    private const val ALIAS = "apc-inventory-copy"
    /** The copy's file name. */
    private const val FILE_NAME = "inventory-copy.bin"
    /** AES in GCM, which checks the file wasn't changed as it decrypts it. */
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    /** The GCM tag's length, in bits. */
    private const val TAG_BITS = 128

    /** Opens the Android Keystore. */
    private fun keyStore(): KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    /** Gives the copy's key, making it in the Keystore the first time. */
    private fun key(): SecretKey {
      (keyStore().getKey(ALIAS, null) as? SecretKey)?.let {
        return it
      }
      val spec =
        KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setKeySize(256)
          .build()
      return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply { init(spec) }.generateKey()
    }
  }
}
