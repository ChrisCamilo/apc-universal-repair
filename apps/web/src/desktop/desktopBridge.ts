// What the desktop app's preload hands the page (see apps/desktop/src/preload.cts): asking for a Windows notification,
// and hearing when one was clicked. In a browser there is none, and the web app shows nothing extra.

/** The desktop app's bridge. */
export type DesktopBridge = {
  /** Asks for a Windows notification, which the app shows only while its window isn't focused. */
  notify: (title: string, message: string) => void
  /** Calls a listener each time a notification is clicked, and gives the way to stop. */
  onOpenNotifications: (listener: () => void) => () => void
}

declare global {
  interface Window {
    apcDesktop?: DesktopBridge
  }
}

/**
 * Gets the desktop app's bridge.
 * @returns The bridge in the desktop app, or undefined in a browser.
 */
export function desktopBridge(): DesktopBridge | undefined {
  return window.apcDesktop
}
