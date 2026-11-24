package com.apc.universalrepair

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.CancellationSignal
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.security.keystore.UserNotAuthenticatedException
import android.util.AtomicFile
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.SecureRandom
import java.security.spec.MGF1ParameterSpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import javax.crypto.spec.SecretKeySpec

/**
 * The phone's copy of the server's inventory on disk (see src/features/inventory/inventoryCopy.ts, as
 * NativeModules.InventoryCopy), behind the phone's own lock (see src/features/auth/AppLock.tsx). The copy is one file
 * in the app's own storage, out of reach of other apps and backups, encrypted with AES-256-GCM under a random key of
 * its own; that key is kept beside it, encrypted under an RSA key pair made in the Android Keystore, which never leaves
 * it. On a phone with a screen lock (fingerprint, face, PIN, pattern or password), the pair's private key opens only
 * for a few seconds after that lock is confirmed, so unlock asks for it (BiometricPrompt, or the lock screen's own
 * confirmation before Android 10) and then keeps the copy's key in memory, until lock drops it; the password never
 * reaches the phone. The public key needs no lock, so the first write makes the copy's key without asking. On a phone
 * with no lock the pair needs none, and unlock asks nothing; once a lock is set, the next unlock moves the copy's key
 * under a pair that needs it. Removing the lock destroys such a pair, and the copy reads as none, copied again. While
 * the copy's key isn't in memory, reading or writing the copy is refused as locked, and nothing is lost. Each file is
 * replaced whole on each write, through a temporary file, so a write cut short leaves the last one. A copy that
 * doesn't decrypt (its key gone, after a restore on another phone) reads as no copy, and the app copies the inventory
 * again. A copy written before the lock, under a Keystore AES key of its own, is moved under the new keys as it is
 * read. Clearing deletes the files and the keys, so nothing of the copy can be read again; uninstalling the app
 * deletes them too.
 */
class InventoryCopyModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ActivityEventListener {
  /** The copy's key, while the app is unlocked. */
  private var dataKey: SecretKey? = null
  /** What the lock screen's confirmation answers, before Android 10, while it shows. */
  private var confirming: ((Boolean) -> Unit)? = null

  init {
    context.addActivityEventListener(this)
  }

  override fun getName() = NAME

  /**
   * Reads the copy.
   * @param promise Resolved with the copy as written, or null when there is none or it doesn't decrypt; rejected with
   * LOCKED while the copy's key isn't in memory.
   */
  @ReactMethod
  fun read(promise: Promise) {
    val copy = file(COPY_FILE)
    if (!copy.baseFile.exists()) {
      promise.resolve(null)
      return
    }
    val keyFile = file(KEY_FILE)
    if (keyFile.baseFile.exists() && dataKey == null) {
      promise.reject(LOCKED, "The copy is locked.")
      return
    }
    try {
      val key = dataKey
      if (key == null) {
        // A copy written before the lock: moved under a key of its own.
        val text = decrypt(copy.readFully(), keyStore().getKey(OLD_ALIAS, null) as SecretKey)
        writeFile(copy, encrypt(text, newDataKey()))
        keyStore().deleteEntry(OLD_ALIAS)
        promise.resolve(text)
        return
      }
      promise.resolve(decrypt(copy.readFully(), key))
    } catch (error: Exception) {
      copy.delete()
      promise.resolve(null)
    }
  }

  /**
   * Replaces the copy, making its key the first time.
   * @param copy The copy, as JSON.
   * @param promise Resolved once it is on disk; rejected with LOCKED while the copy's key isn't in memory.
   */
  @ReactMethod
  fun write(copy: String, promise: Promise) {
    try {
      val key = dataKey ?: if (file(KEY_FILE).baseFile.exists()) null else newDataKey()
      if (key == null) {
        promise.reject(LOCKED, "The copy is locked.")
        return
      }
      writeFile(file(COPY_FILE), encrypt(copy, key))
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("inventory_copy", error)
    }
  }

  /**
   * Deletes the copy, its key and the Keystore's keys.
   * @param promise Resolved once they are gone.
   */
  @ReactMethod
  fun clear(promise: Promise) {
    try {
      deleteAll()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("inventory_copy", error)
    }
  }

  /**
   * Opens the copy: asks for the phone's lock, when the copy's key is under one, and keeps the key in memory.
   * @param title The prompt's title.
   * @param subtitle What the prompt says under it.
   * @param promise Resolved with OPEN once the copy can be read, or there is none to open; or CANCELLED when the lock
   * wasn't confirmed.
   */
  @ReactMethod
  fun unlock(title: String, subtitle: String, promise: Promise) {
    if (dataKey != null || !file(KEY_FILE).baseFile.exists()) {
      promise.resolve(OPEN)
      return
    }
    if (!keyguard().isDeviceSecure) {
      // With no lock, the pair needs none, or was destroyed with the lock it was behind, and the copy is gone.
      open(promise, dropOnFailure = true)
      return
    }
    val needsLock =
      try {
        lockRequired()
      } catch (error: Exception) {
        true
      }
    if (!needsLock) {
      open(promise)
      return
    }
    confirm(title, subtitle) { confirmed -> if (confirmed) open(promise) else promise.resolve(CANCELLED) }
  }

  /**
   * Drops the copy's key from memory, so the next read or write asks for unlock first.
   * @param promise Resolved once dropped.
   */
  @ReactMethod
  fun lock(promise: Promise) {
    dataKey = null
    promise.resolve(null)
  }

  /**
   * Tells whether the phone has a screen lock, which the copy can be kept behind.
   * @param promise Resolved with true when it has one.
   */
  @ReactMethod
  fun hasLock(promise: Promise) {
    promise.resolve(keyguard().isDeviceSecure)
  }

  /** Opens Android's settings for the screen lock, to set one. */
  @ReactMethod
  fun openLockSettings() {
    val intent = Intent(Settings.ACTION_SECURITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == CONFIRM_REQUEST) {
      confirming?.invoke(resultCode == Activity.RESULT_OK)
      confirming = null
    }
  }

  override fun onNewIntent(intent: Intent) {}

  /**
   * Takes the copy's key out from under the Keystore's pair into memory, and moves it under a pair that needs the
   * phone's lock once the phone has one; a pair the lock's removal destroyed leaves no copy to open.
   * @param promise Resolved with OPEN, or CANCELLED when the lock's confirmation has run out.
   * @param dropOnFailure Whether a pair that can't be used, on a phone with no lock, means the copy is gone.
   */
  private fun open(promise: Promise, dropOnFailure: Boolean = false) {
    try {
      val raw =
        Cipher.getInstance(RSA).run {
          init(Cipher.DECRYPT_MODE, keyStore().getKey(LOCK_ALIAS, null) as PrivateKey, OAEP)
          doFinal(file(KEY_FILE).readFully())
        }
      dataKey = SecretKeySpec(raw, "AES")
      if (keyguard().isDeviceSecure && !lockRequired()) {
        keyStore().deleteEntry(LOCK_ALIAS)
        writeFile(file(KEY_FILE), wrap(raw))
      }
      promise.resolve(OPEN)
    } catch (error: UserNotAuthenticatedException) {
      promise.resolve(CANCELLED)
    } catch (error: Exception) {
      Log.w(NAME, "The copy's key didn't open.", error)
      if (error is KeyPermanentlyInvalidatedException || dropOnFailure) {
        deleteAll()
        promise.resolve(OPEN)
      } else {
        promise.reject("inventory_copy", error)
      }
    }
  }

  /**
   * Asks for the phone's lock: fingerprint, face or the screen lock from Android 10, the screen lock before.
   * @param title The prompt's title.
   * @param subtitle What the prompt says under it.
   * @param done Called with whether it was confirmed.
   */
  private fun confirm(title: String, subtitle: String, done: (Boolean) -> Unit) {
    val activity = context.currentActivity
    if (activity == null) {
      done(false)
      return
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val builder = BiometricPrompt.Builder(activity).setTitle(title).setSubtitle(subtitle)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        builder.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
      } else {
        @Suppress("DEPRECATION")
        builder.setDeviceCredentialAllowed(true)
      }
      activity.runOnUiThread {
        builder.build().authenticate(
          CancellationSignal(),
          activity.mainExecutor,
          object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = done(true)

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = done(false)
          },
        )
      }
      return
    }
    @Suppress("DEPRECATION")
    val intent = keyguard().createConfirmDeviceCredentialIntent(title, subtitle)
    if (intent == null) {
      done(true)
      return
    }
    confirming = done
    activity.startActivityForResult(intent, CONFIRM_REQUEST)
  }

  /**
   * Makes a random key for the copy, keeps it in memory, and writes it encrypted under the Keystore's pair.
   * @return The key.
   */
  private fun newDataKey(): SecretKey {
    val raw = ByteArray(32).also { SecureRandom().nextBytes(it) }
    writeFile(file(KEY_FILE), wrap(raw))
    return SecretKeySpec(raw, "AES").also { dataKey = it }
  }

  /**
   * Encrypts the copy's key under the Keystore pair's public key, which needs no lock, making the pair the first time.
   * @param raw The key's bytes.
   * @return The key encrypted.
   */
  private fun wrap(raw: ByteArray): ByteArray {
    val public = (keyStore().getCertificate(LOCK_ALIAS) ?: newPair().let { keyStore().getCertificate(LOCK_ALIAS) }).publicKey
    // The public key copied out of the Keystore, as the Keystore's own doesn't take the OAEP parameters.
    val key = KeyFactory.getInstance(public.algorithm).generatePublic(X509EncodedKeySpec(public.encoded))
    return Cipher.getInstance(RSA).run {
      init(Cipher.ENCRYPT_MODE, key, OAEP)
      doFinal(raw)
    }
  }

  /** Makes the Keystore's pair, its private key behind the phone's lock when it has one. */
  private fun newPair() {
    val spec =
      KeyGenParameterSpec.Builder(LOCK_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setKeySize(2048)
        .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA1)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
    if (keyguard().isDeviceSecure) {
      spec.setUserAuthenticationRequired(true)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        spec.setUserAuthenticationParameters(
          UNLOCK_SECONDS,
          KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL,
        )
      } else {
        @Suppress("DEPRECATION")
        spec.setUserAuthenticationValidityDurationSeconds(UNLOCK_SECONDS)
      }
    }
    KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore").apply { initialize(spec.build()) }.generateKeyPair()
  }

  /** Tells whether the Keystore pair's private key needs the phone's lock. */
  private fun lockRequired(): Boolean {
    val key = keyStore().getKey(LOCK_ALIAS, null) as PrivateKey
    return KeyFactory.getInstance(key.algorithm, "AndroidKeyStore").getKeySpec(key, KeyInfo::class.java).isUserAuthenticationRequired
  }

  /** Deletes the files, the keys and the copy's key in memory. */
  private fun deleteAll() {
    file(COPY_FILE).delete()
    file(KEY_FILE).delete()
    keyStore().deleteEntry(LOCK_ALIAS)
    keyStore().deleteEntry(OLD_ALIAS)
    dataKey = null
  }

  /** A file of the copy, in the app's own storage. */
  private fun file(name: String) = AtomicFile(File(context.filesDir, name))

  /** The lock screen's service. */
  private fun keyguard() = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager

  companion object {
    /** The name JavaScript reaches the module by, as NativeModules.InventoryCopy. */
    const val NAME = "InventoryCopy"

    /** What a read or a write is rejected with while the copy's key isn't in memory. */
    private const val LOCKED = "locked"
    /** What unlock answers once the copy can be read. */
    private const val OPEN = "open"
    /** What unlock answers when the lock wasn't confirmed. */
    private const val CANCELLED = "cancelled"
    /** The Keystore pair the copy's key is kept under. */
    private const val LOCK_ALIAS = "apc-inventory-lock"
    /** The Keystore AES key a copy was encrypted under before the lock. */
    private const val OLD_ALIAS = "apc-inventory-copy"
    /** The copy's file name. */
    private const val COPY_FILE = "inventory-copy.bin"
    /** The copy's key's file name. */
    private const val KEY_FILE = "inventory-copy.key"
    /** How long the private key stays open after the phone's lock is confirmed, in seconds. */
    private const val UNLOCK_SECONDS = 30
    /** The lock screen's confirmation's request, before Android 10. */
    private const val CONFIRM_REQUEST = 4108
    /** AES in GCM, which checks the file wasn't changed as it decrypts it. */
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    /** RSA with OAEP, which the copy's key is encrypted with. */
    private const val RSA = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding"
    /** OAEP with SHA-256, and MGF1 with SHA-1, which the Keystore takes. */
    private val OAEP = OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA1, PSource.PSpecified.DEFAULT)
    /** The GCM tag's length, in bits. */
    private const val TAG_BITS = 128

    /** Opens the Android Keystore. */
    private fun keyStore(): KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    /**
     * Encrypts text: the IV's length, the IV and the ciphertext.
     * @param text The text.
     * @param key The key.
     * @return The bytes to write.
     */
    private fun encrypt(text: String, key: SecretKey): ByteArray {
      val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key) }
      val encrypted = cipher.doFinal(text.toByteArray(Charsets.UTF_8))
      return byteArrayOf(cipher.iv.size.toByte()) + cipher.iv + encrypted
    }

    /**
     * Decrypts what encrypt wrote.
     * @param bytes The bytes.
     * @param key The key.
     * @return The text.
     */
    private fun decrypt(bytes: ByteArray, key: SecretKey): String {
      val ivLength = bytes[0].toInt()
      val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_BITS, bytes, 1, ivLength)) }
      return String(cipher.doFinal(bytes, 1 + ivLength, bytes.size - 1 - ivLength), Charsets.UTF_8)
    }

    /**
     * Replaces a file whole, through a temporary file.
     * @param file The file.
     * @param bytes What it holds.
     */
    private fun writeFile(file: AtomicFile, bytes: ByteArray) {
      val stream = file.startWrite()
      try {
        stream.write(bytes)
        file.finishWrite(stream)
      } catch (error: Exception) {
        file.failWrite(stream)
        throw error
      }
    }
  }
}
