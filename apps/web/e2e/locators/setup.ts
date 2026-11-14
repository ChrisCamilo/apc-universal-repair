import type { Page } from "@playwright/test";
import { DEVICE_MESSAGES } from "@apc/domain/devices";
import { dialog } from "./common.ts";

// What only the desktop app shows (src/features/desktop): the dialogs about the server it ships, its SQLite key's
// recovery copy, the failure shown in place of the login, the update notice, and a device waiting for approval. The
// desktop E2E open them in the compiled app; the login's "Servidor e banco de dados" is in auth's loginForm.

/**
 * The SQLite key's recovery copy, which a fresh install and a new key show until it is kept: the copy and "Já guardei a
 * chave".
 * @param page The app's window.
 * @returns The dialog and its parts.
 */
export function recoveryKey(page: Page) {
  const box = dialog(page, "Chave de recuperação do banco");
  return { ...box, key: box.field("Chave de recuperação"), kept: box.button("Já guardei a chave") };
}

/**
 * The first start's offer to import an old server, which an empty database shows once the recovery copy is kept.
 * @param page The app's window.
 * @returns The dialog and its two answers.
 */
export function firstStart(page: Page) {
  const box = dialog(page, "Começar o APC");
  return { ...box, scratch: box.button("Começar do zero"), importOld: box.button("Importar de um servidor antigo") };
}

/**
 * The question a start after the installer's PostgreSQL choice asks before the server starts: its address, or SQLite.
 * @param page The app's window.
 * @returns The dialog and its "Usar SQLite".
 */
export function databaseChoice(page: Page) {
  const box = dialog(page, "Banco de dados do servidor");
  return { ...box, useSqlite: box.button("Usar SQLite") };
}

/**
 * The Servidor dialog, which the tray's "Servidor e banco de dados…" and the login's button open: the database in use
 * and where, the database to switch to, a section's heading, the note of what it did (a status when done, an alert
 * when it failed), the import's file and rows, and the phone's access with its QR code, certificate code and entry
 * code. Its fields and buttons are common's dialog parts.
 * @param page The app's window.
 * @returns The dialog and its parts.
 */
export function serverSettings(page: Page) {
  const box = dialog(page, "Servidor e banco de dados");
  const { root } = box;
  return {
    ...box,
    // E.g. "SQLite criptografado, em C:\…\data".
    inUse: (text: string | RegExp) => root.getByText(text),
    // The database section's choice, apart from the import's "Servidor antigo", which has the same names.
    database: (name: string) => root.getByRole("radiogroup", { name: "Banco de dados" }).getByRole("radio", { name, exact: true }),
    heading: (name: string) => root.getByRole("heading", { name }),
    done: root.getByRole("status"),
    failed: root.getByRole("alert"),
    // The old server's file, as the file dialog chose it.
    file: (name: string) => root.getByText(name),
    // A table's rows the import copied, e.g. "Usuários: 1 de 1".
    copied: (text: string) => root.getByRole("list", { name: "Linhas copiadas" }).getByText(text),
    phoneAccess: root.getByRole("switch", { name: "Deixar o celular acessar o servidor" }),
    qrCode: root.getByRole("img", { name: "QR code para conectar o celular" }),
    // The certificate's code in groups, as fingerprintGroups writes it.
    fingerprint: (groups: string) => root.getByText(groups),
    // The account's entry code for the phone: two groups of 4 letters and digits that can't be told apart wrongly.
    entryCode: root.getByText(/^[2-9A-HJ-NP-Z]{4} [2-9A-HJ-NP-Z]{4}$/),
  };
}

/**
 * The failure the window shows in place of the login once the server gave up starting: its alert, and the ways out it
 * offers, another port when the port is taken, or the recovery copy when the SQLite key doesn't open the data, with the
 * note refusing a copy that isn't the file's.
 * @param page The app's window.
 * @returns The failure's elements.
 */
export function serverFailure(page: Page) {
  return {
    root: page.getByRole("alert").filter({ hasText: "O servidor não ligou" }),
    otherPort: page.getByRole("button", { name: "Usar outra porta" }),
    key: page.getByLabel("Chave de recuperação", { exact: true }),
    useKey: page.getByRole("button", { name: "Usar a chave de recuperação" }),
    refused: page.getByText("Essa chave não abre o banco deste computador."),
  };
}

/**
 * The live region that says an update is ready to install, empty while there is none.
 * @param page The app's window.
 * @returns The notice.
 */
export function updateNotice(page: Page) {
  // By its id: the page has other status regions, and this one has no name.
  return page.getByTestId("setup.update-notice");
}

/**
 * The question about a device waiting for approval, with whose login it is and its code, and Dispositivos, the user
 * menu's list of the authorized ones.
 * @param page The app's window.
 * @returns The approval's dialog and parts, and the authorized devices' list.
 */
export function devices(page: Page) {
  const approval = dialog(page, DEVICE_MESSAGES.approveTitle);
  return {
    approval: {
      ...approval,
      code: (code: string) => approval.root.getByText(code, { exact: true }),
      name: approval.field("Nome do dispositivo"),
      approve: approval.button("Autorizar"),
    },
    authorized: page.getByRole("list", { name: "Dispositivos autorizados" }),
  };
}
