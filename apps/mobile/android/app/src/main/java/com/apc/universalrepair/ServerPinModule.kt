package com.apc.universalrepair

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/**
 * Hands the paired server from JavaScript (src/api.ts, as NativeModules.ServerPin) to [ServerPin]. The call is
 * synchronous, so the pin is in place before the next request JavaScript sends.
 */
class ServerPinModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "ServerPin"

  /**
   * Pins a server's certificate, or none.
   * @param host The server's host, e.g. "192.168.0.10", or null for none.
   * @param fingerprint Its certificate's fingerprint, or null for none.
   * @return True, as a synchronous method returns a value.
   */
  @ReactMethod(isBlockingSynchronousMethod = true)
  fun pin(host: String?, fingerprint: String?): Boolean {
    ServerPin.pin(host, fingerprint)
    return true
  }
}

/** Registers the app's own modules, which autolinking doesn't find: [ServerPinModule] and [DeviceKeyModule]. */
class ServerPinPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(ServerPinModule(context), DeviceKeyModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
