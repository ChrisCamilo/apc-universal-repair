package com.apc.universalrepair

import android.content.Context
import android.util.Base64
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import java.security.KeyStore
import java.security.MessageDigest
import java.security.cert.X509Certificate
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager
import okhttp3.OkHttpClient

/**
 * Pins the home server's certificate. The server answers HTTPS with a certificate the desktop app made, which no
 * authority vouches for: the phone pairs with it by the SHA-256 fingerprint the Servidor dialog's QR code carries
 * (src/app/api.ts hands it here), and trusts, for that server's address, only a certificate with that fingerprint, whatever
 * address the certificate names, so a new address only needs the code scanned again. Every other address, GitHub's
 * among them, is checked as Android checks it. React Native's requests and images all go through the OkHttp client
 * this installs, before React Native starts.
 */
object ServerPin {
  /** The paired server's host, e.g. "192.168.0.10", or null before pairing. */
  @Volatile private var host: String? = null
  /** Its certificate's fingerprint: the SHA-256 of its DER, in base64url without padding. */
  @Volatile private var fingerprint: String? = null

  /** Android's own trust, for every certificate but the pinned one. */
  private val systemTrust: X509TrustManager =
    TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).run {
      init(null as KeyStore?)
      trustManagers.filterIsInstance<X509TrustManager>().first()
    }

  /** OkHttp's own check of a certificate's address, for every server but the paired one. */
  private val systemHostnames: HostnameVerifier = OkHttpClient.Builder().build().hostnameVerifier

  /** Trusts the pinned certificate, and any other as Android does. */
  private val trust =
    object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) =
        systemTrust.checkClientTrusted(chain, authType)

      override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
        if (!isPinned(chain.firstOrNull())) {
          systemTrust.checkServerTrusted(chain, authType)
        }
      }

      override fun getAcceptedIssuers(): Array<X509Certificate> = systemTrust.acceptedIssuers
    }

  /** On the paired server's address, only the pinned certificate; on any other, OkHttp's own check. */
  private val hostnames = HostnameVerifier { name, session ->
    if (name.equals(host, ignoreCase = true)) {
      isPinned(session.peerCertificates.firstOrNull() as? X509Certificate)
    } else {
      systemHostnames.verify(name, session)
    }
  }

  /**
   * Makes React Native's OkHttp client trust the pinned certificate. Called before React Native starts, so its
   * requests and its images use it.
   * @param context The app's context.
   */
  fun install(context: Context) {
    OkHttpClientProvider.setOkHttpClientFactory(
      OkHttpClientFactory {
        val tls = SSLContext.getInstance("TLS").apply { init(null, arrayOf(trust), null) }
        OkHttpClientProvider.createClientBuilder(context)
          .sslSocketFactory(tls.socketFactory, trust)
          .hostnameVerifier(hostnames)
          .build()
      },
    )
  }

  /**
   * Pins a server's certificate, or none, dropping the connections open to the server before.
   * @param host The server's host, e.g. "192.168.0.10", or null for none.
   * @param fingerprint Its certificate's fingerprint, or null for none.
   */
  fun pin(host: String?, fingerprint: String?) {
    if (host != this.host || fingerprint != this.fingerprint) {
      this.host = host
      this.fingerprint = fingerprint
      OkHttpClientProvider.getOkHttpClient().connectionPool.evictAll()
    }
  }

  /**
   * Tells whether a certificate is the pinned one.
   * @param certificate The certificate the server showed.
   * @return True when its fingerprint is the pinned one.
   */
  private fun isPinned(certificate: X509Certificate?): Boolean {
    val pinned = fingerprint ?: return false
    certificate ?: return false
    val digest = MessageDigest.getInstance("SHA-256").digest(certificate.encoded)
    return Base64.encodeToString(digest, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP) == pinned
  }
}
