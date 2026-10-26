import type { ElectronApplication, Page } from "@playwright/test";

// Makes the app's windows report reduced motion, as the system's setting does. The smoke tests start the app with it,
// so its dialogs, menus and lists open and close at once and a test never reads one halfway through a transition, as
// the web tests do (apps/web/src/test-setup.ts).

/**
 * Makes every window of a running app report reduced motion: the ones open already and each one that opens later.
 * @param app The running app.
 * @returns The same app.
 */
export function reduceMotion(app: ElectronApplication): ElectronApplication {
  const reduce = (page: Page) => void page.emulateMedia({ reducedMotion: "reduce" });
  app.windows().forEach(reduce);
  app.on("window", reduce);
  return app;
}
