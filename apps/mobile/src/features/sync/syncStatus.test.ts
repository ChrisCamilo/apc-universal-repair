/**
 * @format
 */

import { PHONE_TEXTS } from '../../app/phoneTexts';
import { lastSync, syncBadge, syncOutcome } from './syncStatus';

// What the phone says of its copy's sync: the header's status in each state, when the copy last caught up, and how a
// sync the user asked for went.

const IDLE = { syncing: false, offline: false, blocked: false, waiting: 0, conflicts: [] };

// Checks the header says nothing once all is sent, what waits while the server answers, the conflicts to settle, that a
// sync runs, and that the server can't be reached or the phone lacks the local network access, with what waits.
test('Mobile: the header says syncing, offline, blocked, the conflicts or how many changes wait', () => {
  expect(syncBadge(IDLE, 'pt-BR')).toBeNull();
  expect(syncBadge({ ...IDLE, waiting: 1 }, 'pt-BR')).toBe('1 alteração a enviar');
  expect(syncBadge({ ...IDLE, waiting: 3, conflicts: [{}, {}] }, 'pt-BR')).toBe('2 conflitos a resolver');
  expect(syncBadge({ ...IDLE, waiting: 3, syncing: true }, 'pt-BR')).toBe('Sincronizando…');
  expect(syncBadge({ ...IDLE, offline: true }, 'pt-BR')).toBe('Sem conexão');
  expect(syncBadge({ ...IDLE, offline: true, waiting: 2 }, 'pt-BR')).toBe('Sem conexão · 2 alterações');
  expect(syncBadge({ ...IDLE, offline: true, blocked: true, waiting: 1 }, 'pt-BR')).toBe('Sem acesso à rede · 1 alteração');
});

// Checks the last sync reads today's time, another day's date and time, and that it never happened.
test('Mobile: the last sync says when, today or another day', () => {
  const now = new Date(2026, 10, 24, 15, 0);
  expect(lastSync(new Date(2026, 10, 24, 14, 5), 'pt-BR', now)).toBe('Última sincronização hoje às 14:05');
  expect(lastSync(new Date(2026, 10, 23, 9, 30), 'pt-BR', now)).toBe('Última sincronização em 23/11 às 09:30');
  expect(lastSync(null, 'pt-BR', now)).toBe('Ainda não sincronizado com o servidor');
});

// Checks a sync that caught up says so, one that couldn't reach the server says why and what still waits, and one
// without the local network access says that.
test('Mobile: a sync asked for says how it went, and why it failed', () => {
  expect(syncOutcome('synced', 0, 'pt-BR')).toEqual({ ok: true, message: 'Estoque sincronizado com o servidor.' });
  expect(syncOutcome('offline', 2, 'pt-BR')).toEqual({
    ok: false,
    message:
      'Não foi possível sincronizar: o servidor não respondeu. Confira se o celular está no Wi-Fi de casa e se o computador está ligado. 2 alterações esperando o servidor.',
  });
  expect(syncOutcome('blocked', 0, 'pt-BR')).toEqual({ ok: false, message: PHONE_TEXTS['pt-BR'].localNetwork.missing });
});

// Writes the header's status, the last sync and a sync's outcome in English, and checks they read in English, the
// day written month first.
test('Mobile: the sync speaks English', () => {
  const now = new Date(2026, 10, 24, 15, 0);
  expect(syncBadge({ ...IDLE, offline: true, waiting: 2 }, 'en-US')).toBe('No connection · 2 changes');
  expect(syncBadge({ ...IDLE, waiting: 1 }, 'en-US')).toBe('1 change to send');
  expect(syncBadge({ ...IDLE, conflicts: [{}] }, 'en-US')).toBe('1 conflict to settle');
  expect(lastSync(new Date(2026, 10, 23, 9, 30), 'en-US', now)).toBe('Last synced on 11/23 at 09:30');
  expect(lastSync(new Date(2026, 10, 24, 14, 5), 'en-US', now)).toBe('Last synced today at 14:05');
  expect(syncOutcome('synced', 0, 'en-US')).toEqual({ ok: true, message: 'Inventory synced with the server.' });
});
