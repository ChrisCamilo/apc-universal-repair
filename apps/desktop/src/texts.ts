import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { readConfig, updateConfig } from "./config.ts";

// What the main process writes, in the language the page keeps (LOCALE_STORAGE_KEY of @apc/domain/locale): its
// notifications, the tray's menu, the warning about a server on another version, the pages shown while the server
// starts or an update goes in, why the server isn't on, and what the Servidor dialog's changes answer. The page tells
// the language through the preload's bridge, on opening and on each change, and config.json keeps it, so a dialog
// shown before the window opens uses the last run's. The first time, it is the one chosen in the installer, which a
// fresh install leaves in INSTALLER_LANGUAGE_FILE (see build/installer.nsh); the window gets it as an argument, so the
// page starts in it while it has saved none of its own; Portuguese without an installer. The packaged app doesn't
// carry @apc/domain, so its languages are written here.

/** The file a fresh install leaves the language chosen in, in userData: "pt-BR" or "en-US". */
export const INSTALLER_LANGUAGE_FILE = "installer-language.txt";
/** The languages, LOCALES of @apc/domain/locale. */
export const LOCALES = ["pt-BR", "en-US"] as const;
/** The window's argument with the language the page starts in (also written in preload.cts). */
export const LOCALE_ARG = "--apc-locale=";
/** The channel the page tells its language on (also written in preload.cts, which can't import this file). */
export const LOCALE_CHANNEL = "apc:locale";

/** The texts in Portuguese, which the English ones follow key for key. */
const PT_BR = {
  /** Why an import can't start, by what the server's importProblem task found. */
  importProblems: {
    sourceBehind:
      "O banco antigo é de uma versão anterior do APC. Atualize-o primeiro: as migrações desta versão mudam a estrutura dele e mantêm os dados.",
    sourceNewer: "O banco antigo é de uma versão mais nova do APC. Atualize este app antes de importar.",
    sourceNotApc: "Esse banco não é de um servidor APC: não tem as tabelas dele.",
    targetHasData:
      "O banco em uso já tem dados, como uma conta criada. Só dá para importar num banco vazio: importe antes de criar contas, ou troque para um banco vazio.",
  },
  /** The notification of an app opened while an update goes in. */
  installing: {
    title: "O APC está sendo atualizado",
    reopens: "Ele abre sozinho em instantes, já na versão nova.",
    openAgain: "Abra de novo em instantes, quando a versão nova estiver instalada.",
  },
  /** What leaves the server open on a public network, while the phone's access is on. */
  network: {
    publicNetwork: (name: string) =>
      `A rede “${name}” está como Pública, então quem estiver nela chega ao servidor. Deixe-a como Privada nas configurações de Wi-Fi do Windows (passo 3 do guia do servidor em casa).`,
    openRule: "Uma regra do firewall do Windows libera o APC em redes públicas. Deixe-a só para redes privadas (passo 3 do guia do servidor em casa).",
  },
  /** The pages the window shows while the server starts and while an update goes in. */
  pages: {
    starting: { busy: "Ligando o servidor", title: "Ligando o servidor APC…", hints: ["Na primeira vez isso pode levar até um minuto."] },
    updating: {
      busy: "Atualizando o app",
      title: "Atualizando o APC…",
      hints: [
        "O app fecha, e a janela do instalador mostra o andamento da atualização.",
        "Quando ela terminar, o APC abre sozinho, já na versão nova. Não precisa abrir de novo.",
      ],
    },
  },
  /** Why the server the app runs isn't on. */
  serverFailure: {
    /** Who holds a taken port: the program, when the system says which, or another one. */
    holder: (owner?: { name?: string; pid: number }) => (owner ? `pelo programa ${owner.name ?? "sem nome"} (processo ${owner.pid})` : "por outro programa"),
    portInUse: (port: number | undefined, holder: string) => `A porta ${port} já está em uso ${holder}. Feche esse programa e tente de novo, ou use outra porta.`,
    key: "A chave do banco SQLite guardada neste computador não abre com este usuário do Windows.",
    keyMissing: "A chave do banco SQLite não está mais neste computador.",
    keyWrong: "A chave do banco SQLite guardada neste computador não abre o arquivo dele.",
    recovery: "Digite a chave de recuperação que o app mostrou na primeira vez para abrir os dados.",
    stopped: "O servidor parou ao ligar, várias vezes seguidas.",
    timeout: "O servidor não respondeu a tempo.",
    lastError: (error: string) => `Último erro: ${error}`,
  },
  /** What the Servidor dialog's changes answer when they can't be done, and its file dialogs. */
  settings: {
    addressNotKept: "O Windows não deixou guardar o endereço com segurança, então ele não foi salvo.",
    databaseForeign: "Esse banco tem tabelas de outro programa. Use um banco vazio, só para o APC.",
    databaseNewer: "Esse banco é de uma versão mais nova do APC. Atualize este app antes de usá-lo.",
    databaseNotPrepared: (error: string) => `Não foi possível preparar o banco: ${error}`,
    encrypted: "o arquivo é criptografado, e a chave de recuperação dele não veio ou não é a dele; ou ele não é um banco.",
    importFailed: (error: string) => `A importação falhou, e o banco em uso ficou como estava: ${error}`,
    inUse: "Esse é o banco em uso. Escolha o banco do servidor antigo.",
    keyNotChanged: (error: string) => `A chave não foi trocada, e o banco continua com a de antes: ${error}`,
    keyNotChecked: (error: string) => `Não foi possível conferir a chave: ${error}`,
    keyNotKept: "O Windows não deixou guardar a chave com segurança, então ela não foi salva.",
    keyNotOpening: "Essa chave não abre o banco deste computador. Confira se é a chave de recuperação deste app.",
    newKeyNotKept: "O Windows não deixou guardar a chave nova com segurança, então ela não foi trocada.",
    notStarted: (folder: string) => `O servidor não ligou. Veja logs\\api.log em ${folder}.`,
    notStartedOnDatabase: (folder: string) => `O servidor não ligou com esse banco. Veja logs\\api.log em ${folder}.`,
    notStartedOnPort: (port: number, folder: string) => `O servidor não ligou na porta ${port}. Veja logs\\api.log em ${folder}.`,
    oldFile: "Arquivo do servidor antigo",
    oldNotMigrated: (reason: string) => `Não foi possível atualizar o banco antigo: ${reason}`,
    oldNotOpened: (reason: string) => `Não foi possível abrir o banco antigo: ${reason}`,
    oldPhotos: "Pasta das fotos do servidor antigo",
    onlySqliteKey: "Só o banco SQLite tem chave; o PostgreSQL usa a senha do endereço dele.",
    portRange: (min: number, max: number) => `A porta é um número de ${min} a ${max}.`,
    postgresqlAddress: "O endereço começa com postgresql://, como postgresql://usuário:senha@localhost:5432/apc.",
    postgresqlNotConnected: (error: string) => `Não foi possível conectar ao PostgreSQL: ${error}`,
    recoveryKeyShape: "A chave de recuperação tem 64 letras e números, de 0 a 9 e de A a F; os traços não contam.",
    sqliteFiles: "Banco SQLite",
  },
  /** The warning about a server on another computer at another version than the app. */
  serverVersion: (appVersion: string, apiVersion: string | undefined) =>
    `O servidor APC está ${apiVersion ? `na versão ${apiVersion}` : "numa versão anterior à 0.2.0"}, e este app na ${appVersion}. Atualize o servidor no computador onde ele roda para evitar erros.`,
  /** The tray's menu. */
  tray: {
    address: (url: string) => `Servidor ligado em ${url} (clique para copiar)`,
    local: "Servidor ligado só neste computador",
    noNetwork: "Servidor ligado, sem rede para o celular",
    off: "Servidor desligado: veja Servidor e banco de dados",
    open: "Abrir o APC",
    quit: "Sair",
    settings: "Servidor e banco de dados…",
    startup: "Iniciar com o Windows",
  },
  /** The notification, the first time closing the window hides it in the tray. */
  trayNotice: {
    title: "O APC continua ligado",
    phone: "O servidor segue ligado para o celular. Para sair, use Sair no ícone do APC perto do relógio.",
    server: "O servidor segue ligado. Para sair, use Sair no ícone do APC perto do relógio.",
  },
};

/** The main process's texts in one language. */
export type DesktopTexts = typeof PT_BR;
/** A language, e.g. "en-US". */
export type Locale = (typeof LOCALES)[number];

/** The main process's texts, by language. */
export const DESKTOP_TEXTS: Record<Locale, DesktopTexts> = {
  "pt-BR": PT_BR,
  "en-US": {
    importProblems: {
      sourceBehind: "The old database is from an earlier version of APC. Update it first: this version's migrations change its structure and keep its data.",
      sourceNewer: "The old database is from a newer version of APC. Update this app before importing.",
      sourceNotApc: "This database isn't an APC server's: it doesn't have its tables.",
      targetHasData:
        "The database in use already has data, such as an account created. You can only import into an empty database: import before creating accounts, or switch to an empty database.",
    },
    installing: {
      title: "APC is being updated",
      reopens: "It opens by itself in a moment, already on the new version.",
      openAgain: "Open it again in a moment, once the new version is installed.",
    },
    network: {
      publicNetwork: (name) =>
        `The network “${name}” is set to Public, so anyone on it reaches the server. Set it to Private in Windows' Wi-Fi settings (step 3 of the home server guide).`,
      openRule: "A Windows firewall rule lets APC in on public networks. Keep it for private networks only (step 3 of the home server guide).",
    },
    pages: {
      starting: { busy: "Starting the server", title: "Starting the APC server…", hints: ["The first time, this can take up to a minute."] },
      updating: {
        busy: "Updating the app",
        title: "Updating APC…",
        hints: [
          "The app closes, and the installer's window shows how the update is going.",
          "When it ends, APC opens by itself, already on the new version. There's no need to open it again.",
        ],
      },
    },
    serverFailure: {
      holder: (owner) => (owner ? `by the program ${owner.name ?? "with no name"} (process ${owner.pid})` : "by another program"),
      portInUse: (port, holder) => `Port ${port} is already in use ${holder}. Close that program and try again, or use another port.`,
      key: "The SQLite database's key kept on this computer doesn't open with this Windows user.",
      keyMissing: "The SQLite database's key isn't on this computer any more.",
      keyWrong: "The SQLite database's key kept on this computer doesn't open its file.",
      recovery: "Type the recovery key the app showed the first time to open the data.",
      stopped: "The server stopped while starting, several times in a row.",
      timeout: "The server didn't answer in time.",
      lastError: (error) => `Last error: ${error}`,
    },
    settings: {
      addressNotKept: "Windows didn't let the address be kept safely, so it wasn't saved.",
      databaseForeign: "This database has another program's tables. Use an empty database, for APC only.",
      databaseNewer: "This database is from a newer version of APC. Update this app before using it.",
      databaseNotPrepared: (error) => `Couldn't prepare the database: ${error}`,
      encrypted: "the file is encrypted, and its recovery key didn't come or isn't its own; or it isn't a database.",
      importFailed: (error) => `The import failed, and the database in use was left as it was: ${error}`,
      inUse: "This is the database in use. Choose the old server's database.",
      keyNotChanged: (error) => `The key wasn't changed, and the database keeps the one it had: ${error}`,
      keyNotChecked: (error) => `Couldn't check the key: ${error}`,
      keyNotKept: "Windows didn't let the key be kept safely, so it wasn't saved.",
      keyNotOpening: "This key doesn't open this computer's database. Check it is this app's recovery key.",
      newKeyNotKept: "Windows didn't let the new key be kept safely, so it wasn't changed.",
      notStarted: (folder) => `The server didn't start. See logs\\api.log in ${folder}.`,
      notStartedOnDatabase: (folder) => `The server didn't start with this database. See logs\\api.log in ${folder}.`,
      notStartedOnPort: (port, folder) => `The server didn't start on port ${port}. See logs\\api.log in ${folder}.`,
      oldFile: "The old server's file",
      oldNotMigrated: (reason) => `Couldn't update the old database: ${reason}`,
      oldNotOpened: (reason) => `Couldn't open the old database: ${reason}`,
      oldPhotos: "The old server's photos folder",
      onlySqliteKey: "Only the SQLite database has a key; PostgreSQL uses its address's password.",
      portRange: (min, max) => `The port is a number from ${min} to ${max}.`,
      postgresqlAddress: "The address starts with postgresql://, as in postgresql://user:password@localhost:5432/apc.",
      postgresqlNotConnected: (error) => `Couldn't connect to PostgreSQL: ${error}`,
      recoveryKeyShape: "The recovery key has 64 letters and digits, from 0 to 9 and from A to F; the dashes don't count.",
      sqliteFiles: "SQLite database",
    },
    serverVersion: (appVersion, apiVersion) =>
      `The APC server is ${apiVersion ? `on version ${apiVersion}` : "on a version before 0.2.0"}, and this app on ${appVersion}. Update the server on the computer it runs on to avoid errors.`,
    tray: {
      address: (url) => `Server on at ${url} (click to copy)`,
      local: "Server on for this computer only",
      noNetwork: "Server on, with no network for the phone",
      off: "Server off: see Server and database",
      open: "Open APC",
      quit: "Quit",
      settings: "Server and database…",
      startup: "Start with Windows",
    },
    trayNotice: {
      title: "APC is still on",
      phone: "The server stays on for the phone. To quit, use Quit on the APC icon by the clock.",
      server: "The server stays on. To quit, use Quit on the APC icon by the clock.",
    },
  },
};

/** The language the main process writes in, until the page or config.json says another. */
let current: Locale = "pt-BR";

/**
 * Gives the language config.json keeps, moving the installer's into it first unless it keeps one already, and removes
 * the installer's file.
 * @param userData The app's userData folder, where config.json is.
 * @returns The language, Portuguese when none is kept.
 */
export function adoptInstallerLanguage(userData: string): Locale {
  let config = readConfig(userData);
  const file = path.join(userData, INSTALLER_LANGUAGE_FILE);
  let left: string | undefined;
  try {
    left = readFileSync(file, "utf8").trim();
    rmSync(file, { force: true });
  } catch {
    // No install left one.
  }
  if (isLocale(left) && !config.locale) {
    config = updateConfig(userData, { locale: left });
  }
  return isLocale(config.locale) ? config.locale : "pt-BR";
}

/**
 * Tells whether a value is one of the languages.
 * @param value What the page sent or config.json holds.
 * @returns Whether it is a language.
 */
export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Gives the language the main process writes in.
 * @returns The language, e.g. "pt-BR".
 */
export function language(): Locale {
  return current;
}

/**
 * Changes the language the main process writes in.
 * @param locale The language the page keeps, or config.json from the last run.
 */
export function setLanguage(locale: Locale): void {
  current = locale;
}

/**
 * Gives the main process's texts in its language.
 * @returns The texts.
 */
export function texts(): DesktopTexts {
  return DESKTOP_TEXTS[current];
}
