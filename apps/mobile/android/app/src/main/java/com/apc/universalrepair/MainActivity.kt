package com.apc.universalrepair

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "ApcUniversalRepair"

  /**
   * Returns the instance of the [ReactActivityDelegate]: the [DefaultReactActivityDelegate], which renders with the New
   * Architecture, the only one React Native 0.88 has.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName)
}
