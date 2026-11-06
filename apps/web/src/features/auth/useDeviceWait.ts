import { useEffect, useRef, useState } from 'react'
import { waitForDevice, type AuthService, type Credentials, type SessionUser } from '@apc/shared/auth'

// A login or sign-up from a device the server's computer hasn't authorized waits here (see @apc/shared/devices): the
// screen shows the device's code while waitForDevice asks whether it was authorized, then logs in with what was typed.
// Another login, or the screen closing, stops the wait.

/** A login told to wait: the device's short code, and the user and password to log in with once it is authorized. */
export type DeviceWait = { code: string; credentials: Credentials }

/**
 * Waits for the device's authorization while a login or sign-up is told to.
 * @param auth The AuthService.
 * @param onLoggedIn Called with the user once the device is authorized and the login goes through.
 * @param onRefused Called when the device was refused or removed on the server's computer.
 * @returns The wait shown, if any, and the ways to start and stop it.
 */
export function useDeviceWait(auth: AuthService, onLoggedIn: (user: SessionUser) => void, onRefused: () => void) {
  const [waiting, setWaiting] = useState<DeviceWait>()
  // The latest callbacks, so a new one from the owner doesn't start the wait over.
  const done = useRef({ onLoggedIn, onRefused })
  useEffect(() => {
    done.current = { onLoggedIn, onRefused }
  })

  useEffect(() => {
    if (!waiting) {
      return
    }
    const stop = new AbortController()
    void waitForDevice(auth, () => auth.login(waiting.credentials), stop.signal).then((user) => {
      if (user === undefined) {
        return
      }
      setWaiting(undefined)
      if (user) {
        done.current.onLoggedIn(user)
      } else {
        done.current.onRefused()
      }
    })
    return () => stop.abort()
  }, [auth, waiting])

  return { waiting, wait: setWaiting, stop: () => setWaiting(undefined) }
}
