package com.apc.universalrepair

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * The phone's device key for logging in (see @apc/shared/devices): an ECDSA P-256 key pair made in the Android
 * Keystore on its first use, whose private key never leaves it, not even to the app. JavaScript (src/auth/deviceKey.ts,
 * as NativeModules.DeviceKey) gets the public key, SPKI in base64url, and the Keystore's signature of a nonce, turned
 * from DER into r and s, 32 bytes each, as the API checks it. Uninstalling the app deletes the key, so the phone is
 * authorized again after a new install.
 */
class DeviceKeyModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

  /**
   * Gives the device's public key, making the key pair the first time.
   * @param promise Resolved with SPKI in base64url.
   */
  @ReactMethod
  fun publicKey(promise: Promise) {
    try {
      privateKey()
      promise.resolve(base64url(keyStore().getCertificate(ALIAS).publicKey.encoded))
    } catch (error: Exception) {
      promise.reject("device_key", error)
    }
  }

  /**
   * Signs a nonce the API handed out with the device's private key.
   * @param nonce The nonce.
   * @param promise Resolved with the signature, r and s in base64url.
   */
  @ReactMethod
  fun sign(nonce: String, promise: Promise) {
    try {
      val signer = Signature.getInstance("SHA256withECDSA").apply {
        initSign(privateKey())
        update(nonce.toByteArray(Charsets.UTF_8))
      }
      promise.resolve(base64url(rawSignature(signer.sign())))
    } catch (error: Exception) {
      promise.reject("device_key", error)
    }
  }

  companion object {
    /** The name JavaScript reaches the module by, as NativeModules.DeviceKey. */
    const val NAME = "DeviceKey"

    /** The key pair's name in the Keystore. */
    private const val ALIAS = "apc-device"
    /** The size of r and of s on P-256, in bytes. */
    private const val PART = 32

    /** Opens the Android Keystore. */
    private fun keyStore(): KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    /** Gives the device's private key, making the key pair in the Keystore the first time. */
    private fun privateKey(): PrivateKey {
      (keyStore().getKey(ALIAS, null) as? PrivateKey)?.let {
        return it
      }
      val spec =
        KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_SIGN)
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256)
          .build()
      return KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").apply { initialize(spec) }.generateKeyPair().private
    }

    /** Writes bytes as base64url without padding. */
    private fun base64url(bytes: ByteArray): String = Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

    /**
     * Turns a DER ECDSA signature, SEQUENCE { INTEGER r, INTEGER s }, into r and s, 32 bytes each.
     * @param der The Keystore's signature.
     * @return The 64 bytes the API checks.
     */
    private fun rawSignature(der: ByteArray): ByteArray {
      var at = 2 + (if (der[1].toInt() and 0x80 != 0) der[1].toInt() and 0x7f else 0)
      val parts = (0 until 2).map {
        val length = der[at + 1].toInt()
        val value = BigInteger(1, der.copyOfRange(at + 2, at + 2 + length)).toByteArray().takeLast(PART).toByteArray()
        at += 2 + length
        ByteArray(PART - value.size) + value
      }
      return parts[0] + parts[1]
    }
  }
}
