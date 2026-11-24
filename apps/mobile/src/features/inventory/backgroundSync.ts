import { lowStockAlerts, lowStockKey, lowStockMessage, readLowStockWarned } from '@apc/domain/notifications';
import { copyItems } from '@apc/domain/sync-copy';
import { withQueue } from '@apc/domain/sync-queue';
import { TOAST_KIND_LOOKS } from '@apc/ui-spec/toast';
import { loadServer } from '../../app/api';
import { save, themeStorage } from '../../app/theme';
import { auth } from '../auth/auth';
import { showSystemNotification } from '../notifications/systemNotifications';
import { loadCopy, loadQueue, onRefused, syncCopy } from './inventoryCopy';

// The copy's sync while the app is out of sight, which Android pauses the app's JavaScript for: every 15 minutes or
// so, with a network, BackgroundSyncJob.kt runs this as a headless task, with no screen. It reads the paired server and
// the saved session, and syncs the copy, sending what waits; a copy behind the phone's lock that the app hasn't opened
// since it started (see AppLock.tsx) waits for the app instead. What the sync brought that needs the user goes to the
// Android shade (see systemNotifications.ts): why the server refused or settled against a change sent, as the toasts
// say it, and the items newly at or below their minimum, in one warning, once while they stay there. The bell and its
// toasts still say them once the app is open: the warning is kept apart from the ones the bell already said
// (lowStockNotifiedKey), so the Inventory says it when it loads.

/** The headless task's name, which BackgroundSyncJob.kt starts. */
export const BACKGROUND_SYNC_TASK = 'ApcBackgroundSync';

/**
 * Names the storage key of the items low on stock a user was told of in the shade.
 * @param userId The user's id.
 * @returns E.g. "apc-low-stock-notified:<id>".
 */
export function lowStockNotifiedKey(userId: string): string {
  return `apc-low-stock-notified:${userId}`;
}

/**
 * Syncs the copy with no screen, and shows in the shade what it brought that needs the user.
 */
export async function backgroundSync(): Promise<void> {
  const [user] = await Promise.all([auth.currentUser().catch(() => null), loadServer()]);
  if (!user) {
    return;
  }
  try {
    await loadCopy();
  } catch {
    // Behind the phone's lock: the app opens it.
    return;
  }
  const notices: string[] = [];
  const stop = onRefused((each) => notices.push(...each));
  const result = await syncCopy().finally(stop);
  for (const notice of notices) {
    await showSystemNotification(TOAST_KIND_LOOKS.error.title, notice);
  }
  if (result !== 'synced') {
    return;
  }
  const items = copyItems(withQueue(await loadCopy(), await loadQueue()));
  const [warned, notified] = await Promise.all(
    [lowStockKey(user.id), lowStockNotifiedKey(user.id)].map((key) => themeStorage.getItem(key).catch(() => null)),
  );
  const { alerts, warned: low } = lowStockAlerts(items, [...readLowStockWarned(warned), ...readLowStockWarned(notified)]);
  save(lowStockNotifiedKey(user.id), JSON.stringify(low));
  if (alerts.length > 0) {
    await showSystemNotification(TOAST_KIND_LOOKS.warning.title, lowStockMessage(alerts));
  }
}
