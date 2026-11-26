import type { Locale } from '@apc/domain/locale';
import { waitingNotice } from '@apc/domain/sync-queue';
import { PHONE_TEXTS } from '../../app/phoneTexts';
import type { SyncResult } from './inventoryCopy';

// What the phone says of its copy's sync (see useInventoryCopy.tsx), in the language chosen: in the Dashboard's header, a short
// status while one is worth saying (syncing, away from the server, without the local network access, conflicts with
// the computer to settle, or changes waiting), nothing once all is sent; in the user menu, when the copy last caught up; and, after "Sincronizar agora",
// how it went and why it failed.

/** The copy's sync as the screens read it. */
export type SyncStatus = {
  syncing: boolean;
  offline: boolean;
  blocked: boolean;
  /** How many changes wait to be sent. */
  waiting: number;
  /** The conflicts with the computer waiting to be settled. */
  conflicts: readonly unknown[];
};

/**
 * Writes the header's status.
 * @param status The sync.
 * @param locale The language.
 * @returns E.g. "Sincronizando…", "Sem conexão · 2 alterações", "Sem acesso à rede", "1 conflito a resolver", "1
 * alteração a enviar", or null once all is sent and the server answered.
 */
export function syncBadge(status: SyncStatus, locale: Locale): string | null {
  const texts = PHONE_TEXTS[locale].sync;
  const waiting = status.waiting > 0 ? texts.changes(status.waiting) : null;
  if (status.syncing) {
    return texts.syncing;
  }
  if (status.blocked || status.offline) {
    return [status.blocked ? texts.blocked : texts.offline, waiting].filter(Boolean).join(' · ');
  }
  const conflicts = status.conflicts.length;
  if (conflicts > 0) {
    return texts.conflicts(conflicts);
  }
  return waiting && texts.waiting(waiting);
}

/**
 * Says when the copy last caught up with the server, in the phone's own time.
 * @param syncedAt When, or null before it first did.
 * @param locale The language, which also orders the day and the month ("23/11" or "11/23").
 * @param now Today, to say "hoje".
 * @returns E.g. "Última sincronização hoje às 14:05", "… em 23/11 às 09:30", or that it never did.
 */
export function lastSync(syncedAt: Date | null, locale: Locale, now = new Date()): string {
  const texts = PHONE_TEXTS[locale].sync;
  if (!syncedAt) {
    return texts.never;
  }
  const two = (value: number) => String(value).padStart(2, '0');
  const [day, month] = [two(syncedAt.getDate()), two(syncedAt.getMonth() + 1)];
  return texts.last({
    today: syncedAt.toDateString() === now.toDateString(),
    day: locale === 'en-US' ? `${month}/${day}` : `${day}/${month}`,
    time: `${two(syncedAt.getHours())}:${two(syncedAt.getMinutes())}`,
  });
}

/**
 * Says how a sync the user asked for went.
 * @param result How it ended.
 * @param waiting How many changes still wait afterwards.
 * @param locale The language of how many wait.
 * @returns The message, and whether it went well.
 */
export function syncOutcome(result: SyncResult, waiting: number, locale: Locale): { ok: boolean; message: string } {
  if (result === 'blocked') {
    return { ok: false, message: PHONE_TEXTS[locale].localNetwork.missing };
  }
  if (result === 'offline') {
    const kept = waiting > 0 ? ` ${waitingNotice(waiting, locale)}` : '';
    return {
      ok: false,
      message: `${PHONE_TEXTS[locale].sync.failed}${kept}`,
    };
  }
  return { ok: true, message: PHONE_TEXTS[locale].sync.done };
}
