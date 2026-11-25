import { waitingNotice } from '@apc/domain/sync-queue';
import { LOCAL_NETWORK_TEXTS } from '../../app/localNetwork';
import type { SyncResult } from './inventoryCopy';

// What the phone says of its copy's sync (see useInventoryCopy.tsx), in Portuguese: in the Dashboard's header, a short
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
 * Says how many changes wait, in short.
 * @param count How many, more than none.
 * @returns E.g. "1 alteração" or "3 alterações".
 */
function changes(count: number): string {
  return `${count} ${count === 1 ? 'alteração' : 'alterações'}`;
}

/**
 * Writes the header's status.
 * @param status The sync.
 * @returns E.g. "Sincronizando…", "Sem conexão · 2 alterações", "Sem acesso à rede", "1 conflito a resolver", "1
 * alteração a enviar", or null once all is sent and the server answered.
 */
export function syncBadge(status: SyncStatus): string | null {
  const waiting = status.waiting > 0 ? changes(status.waiting) : null;
  if (status.syncing) {
    return 'Sincronizando…';
  }
  if (status.blocked || status.offline) {
    return [status.blocked ? 'Sem acesso à rede' : 'Sem conexão', waiting].filter(Boolean).join(' · ');
  }
  const conflicts = status.conflicts.length;
  if (conflicts > 0) {
    return `${conflicts} ${conflicts === 1 ? 'conflito' : 'conflitos'} a resolver`;
  }
  return waiting && `${waiting} a enviar`;
}

/**
 * Says when the copy last caught up with the server, in the phone's own time.
 * @param syncedAt When, or null before it first did.
 * @param now Today, to say "hoje".
 * @returns E.g. "Última sincronização hoje às 14:05", "… em 23/11 às 09:30", or that it never did.
 */
export function lastSync(syncedAt: Date | null, now = new Date()): string {
  if (!syncedAt) {
    return 'Ainda não sincronizado com o servidor';
  }
  const two = (value: number) => String(value).padStart(2, '0');
  const time = `${two(syncedAt.getHours())}:${two(syncedAt.getMinutes())}`;
  const today = syncedAt.toDateString() === now.toDateString();
  return `Última sincronização ${today ? 'hoje' : `em ${two(syncedAt.getDate())}/${two(syncedAt.getMonth() + 1)}`} às ${time}`;
}

/**
 * Says how a sync the user asked for went.
 * @param result How it ended.
 * @param waiting How many changes still wait afterwards.
 * @returns The message, and whether it went well.
 */
export function syncOutcome(result: SyncResult, waiting: number): { ok: boolean; message: string } {
  if (result === 'blocked') {
    return { ok: false, message: LOCAL_NETWORK_TEXTS.missing };
  }
  if (result === 'offline') {
    const kept = waiting > 0 ? ` ${waitingNotice(waiting)}` : '';
    return {
      ok: false,
      message: `Não foi possível sincronizar: o servidor não respondeu. Confira se o celular está no Wi-Fi de casa e se o computador está ligado.${kept}`,
    };
  }
  return { ok: true, message: 'Estoque sincronizado com o servidor.' };
}
