package com.apc.universalrepair

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Hands the paired server from JavaScript (src/api.ts, as NativeModules.ServerPin) to [ServerPin]. The call is
 * synchronous, so the pin is in place before the next request JavaScript sends.
 */
class ServerPinModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = NAME

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

  companion object {
    /** The name JavaScript reaches the module by, as NativeModules.ServerPin. */
    const val NAME = "ServerPin"
  }
}

/**
 * Registers the app's own modules, which autolinking doesn't find: [ServerPinModule] and [DeviceKeyModule]. Both are
 * classic modules, not TurboModules, which React Native's New Architecture serves through its interop layer; each is
 * made when JavaScript first asks for it.
 */
class ServerPinPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      ServerPinModule.NAME -> ServerPinModule(reactContext)
      DeviceKeyModule.NAME -> DeviceKeyModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(ServerPinModule.NAME to ServerPinModule::class.java, DeviceKeyModule.NAME to DeviceKeyModule::class.java)
      .mapValues { (name, type) ->
        ReactModuleInfo(
          name = name,
          className = type.name,
          canOverrideExistingModule = false,
          needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = false,
        )
      }
  }
}
