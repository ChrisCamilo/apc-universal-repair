import { apiFetch, entryCodeSchema, type EntryCode } from '@apc/domain/auth'
import { deviceListSchema, deviceSchema, type Device } from '@apc/domain/devices'
import type { Locale } from '@apc/domain/locale'
import { API_BASE } from '../../app/api.ts'
import { DESKTOP_TEXTS } from './desktopTexts.ts'

// The calls of the devices' screens on the server's computer (see DeviceApprovals.tsx and DevicesDialog.tsx): the
// list, authorizing, renaming and removing a device, and the entry code that logs a phone in (see PairingCode.tsx).
// Each answers what went wrong in the language chosen: the API's 401 when nobody is logged in here, its 403 when the
// app isn't on the server's computer, and the message of a 501, as the web app's demo says it doesn't do it.

/** How a call ended: what it answered, or what to say. */
export type DevicesOutcome<T> = { ok: true; value: T } | { ok: false; message: string }

/**
 * Authorizes a device, naming it.
 * @param id The device.
 * @param name The name typed, or blank for "Dispositivo <code>".
 * @param locale The language to say what went wrong in.
 * @returns The device authorized, or what to say.
 */
export function authorizeDevice(id: string, name: string, locale: Locale): Promise<DevicesOutcome<Device>> {
  return call(`/devices/${id}/authorize`, { method: 'POST', body: { name } }, (body) => deviceSchema.parse(body), locale)
}

/**
 * Calls a devices' route and reads its answer.
 * @param path The route, e.g. "/devices".
 * @param request Its method and JSON body.
 * @param read Reads the body of a success.
 * @param locale The language to say what went wrong in.
 * @returns The value read, or what to say.
 */
async function call<T>(
  path: string,
  request: { method: string; body?: unknown },
  read: (body: unknown) => T,
  locale: Locale,
): Promise<DevicesOutcome<T>> {
  const response = await apiFetch(`${API_BASE}${path}`, {
    method: request.method,
    ...(request.body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request.body) }),
  }).catch(() => null)
  if (response?.ok) {
    return { ok: true, value: read(response.status === 204 ? undefined : await response.json()) }
  }
  if (response?.status === 501) {
    return { ok: false, message: ((await response.json()) as { message: string }).message }
  }
  const status = response?.status
  const failed = DESKTOP_TEXTS[locale].devicesFailed
  return { ok: false, message: status === 401 ? failed.signedOut : status === 403 ? failed.elsewhere : failed.failed }
}

/**
 * Asks for an entry code, which logs a phone into the account open here (see PairingCode.tsx), replacing the one
 * before.
 * @param locale The language to say what went wrong in.
 * @returns The code and when it ends, or what to say.
 */
export function issueEntryCode(locale: Locale): Promise<DevicesOutcome<EntryCode>> {
  return call('/pairings', { method: 'POST' }, (body) => entryCodeSchema.parse(body), locale)
}

/**
 * Lists every user's devices, pending first.
 * @param locale The language to say what went wrong in.
 * @returns The devices, or what to say.
 */
export function listDevices(locale: Locale): Promise<DevicesOutcome<Device[]>> {
  return call('/devices', { method: 'GET' }, (body) => deviceListSchema.parse(body).devices, locale)
}

/**
 * Removes a device, ending its sessions; refusing a waiting one does the same.
 * @param id The device.
 * @param locale The language to say what went wrong in.
 * @returns Done, or what to say.
 */
export function removeDevice(id: string, locale: Locale): Promise<DevicesOutcome<void>> {
  return call(`/devices/${id}`, { method: 'DELETE' }, () => undefined, locale)
}

/**
 * Renames a device.
 * @param id The device.
 * @param name The new name, or blank for "Dispositivo <code>".
 * @param locale The language to say what went wrong in.
 * @returns The device renamed, or what to say.
 */
export function renameDevice(id: string, name: string, locale: Locale): Promise<DevicesOutcome<Device>> {
  return call(`/devices/${id}`, { method: 'PATCH', body: { name } }, (body) => deviceSchema.parse(body), locale)
}
