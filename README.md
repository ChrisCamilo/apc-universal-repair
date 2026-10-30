# APC Universal Repair

🇺🇸 [English (US)](#-english-us) | 🇧🇷 [Português (Brasil)](#-português-brasil)

---

## 🇺🇸 English (US)

### About the Project

**APC Universal Repair** is a vehicle catalog organized by brand, where you can view each vehicle's 3D model and learn how every part was originally assembled. The goal is to promote good maintenance practices by giving access to the vehicle's technical specifications — bolt and screw measurements, torque values, original part codes, possible diagnostics, and reference prices whenever available.

It also includes a **parts inventory**, so a workshop can keep track of the parts it has in stock and find, from a part's code, which vehicles it fits.

🌐 **Try it in the browser:** the [interactive demo](https://chriscamilo.github.io/apc-universal-repair/demo/) is the real web app on [GitHub Pages](https://chriscamilo.github.io/apc-universal-repair/), logged in with a sample workshop's stock: search, create, edit and import parts, and browse the Catalog. It needs no server: everything stays in your browser and starts over on reload. The [design system and screens](https://chriscamilo.github.io/apc-universal-repair/storybook/?path=/story/screens--dashboard&panel=false) are there too, in the Storybook, in the 4 styles, day and night (the toolbar at the top switches them).

### Features

**MVP ✅ (done, on web and mobile)**

- 🔐 Login and account sign-up (name, username, e-mail and password), with the users kept in the database and the passwords stored hashed, sessions the API checks on every call, and a forgotten-password notice saying whom to ask
- 🗂️ Dashboard with tabs that can be dragged into a new order, and a user menu with the visual style, dark mode, the list preferences, the tutorial and logout
- 📦 Parts inventory: add, view, edit and delete parts, each with its category, the vehicles it fits (each a vehicle brand and, optionally, its model), position, side, minimum stock and the vehicle maker's original codes, made by one or more part brands, each with its own part code, color, location, quantity, unit price (R$) and photos
- 👯 *Duplicar* in a part's details opens a new part filled in as a copy of it, with or without copies of its photos, its codes left blank and its stock at 0
- 🏷️ Categories, part brands and vehicle models created right from the item form, and renamed, merged or deleted in their own lists
- 🔢 A part code already in use is flagged while it is typed, ignoring case, spaces and separators ("CB4500" is "CB-4500")
- 🧭 Inventory search by name or part code, filters, sorting on every column and pagination (25, 50 or 100 per page)
- 🚦 Low-stock and out-of-stock rows highlighted in color
- 🖼️ Up to 3 photos per part, with a large viewer
- 📄 Batch import of parts from CSV, the rows of one item's brands grouped by its "item" column, its vehicles in "vehicles" and its original codes in "original_codes", and export of the list (every page, optionally with the photo paths) in the same format
- 🎓 Guided tutorial the first time the Inventory tab is opened, available again from the user menu
- 🎨 Four visual styles — **Anos 80**, **GT4**, **BMW 90** and **Fiat 90** — each with light and dark modes; by day each one is tinted in its own hue (sand, steel blue, warm grey-red and sage), with no white panels

**Mobile Redesign (in progress)**

- 📱 A phone layout, on the web and in the native app, with the tabs in a bottom bar, followed by Alertas and Conta ✅
- 🔑 Login and sign-up laid out for phones ✅
- 🃏 The Inventory as a list of cards that loads more as it scrolls ✅
- 🧾 Filters, sorting and the other actions in bottom sheets, dialogs opening full screen, and buttons, fields and chips sized for touch ✅
- 🚧 Still to lay out for phones: an item's details and form as full screens, the lists, CSV and About dialogs, the Inventory tutorial and the Catalog tab

**Phase 2 (in progress)**

- 📚 Vehicle catalog organized by brand, model, generation, version, year and engine, on sample data ✅
- 🔎 Catalog search by brand, model or the code of a part in stock ✅
- 🚧 Until phase 2 is done the Catalog tab shows as a work in progress: it opens blurred behind a notice that it isn't ready yet

**Phase 3**

- 🎨 Toasts by kind: green for success, red for errors, blue for info and yellow for warnings, each with its icon ✅
- 🔔 A bell beside the user menu with the latest notifications, kept for each user ✅
- ⏱️ The toast's duration, 5 s by default, set from 2 s to 15 s in the bell's menu ✅
- 📉 Warnings for parts at or below their minimum stock, once while they stay low ✅
- 🪟 Errors and warnings as Windows notifications in the desktop app, while its window is in the background ✅
- 📱 The same as Android notifications on the phone

**Next**

- 🗜️ Photos reduced when they are saved: the web and the phone shrink them before sending, and the API stores them as WebP of up to 1600px with no location data, so a photo over 3 MB can still be added ✅
- 🏠 The API running on a home computer, for the mobile app on the same Wi-Fi, turned on by a desktop shortcut or in the background ✅
- 🖥️ Windows desktop app, which turns the server on by itself when it isn't running ✅
- 🔄 The desktop app updating itself from GitHub Releases ✅
- 🔁 The server at home following the desktop app's version ✅
- 📱 Android release build, signed with the upload key, built by CI ✅
- 🔐 Sessions checked on every call, login and sign-up attempts limited, and the SQLite file encrypted at rest ✅
- 🔗 The phone paired with the server at home over HTTPS, by QR code, and each new device authorized on the server's computer
- 📲 The phone app saying when a new version is out
- 🏷️ A new stock starting with the usual categories and part brands

**Later**

- 🧩 Interactive 3D vehicle models
- 🔩 Original assembly reference for every part
- ⚙️ Technical specs: bolt/screw sizes and torque values
- 🔍 Diagnostic guidance for common issues
- 💰 Reference prices, when available

**TBD**

- 📋 Vehicle spec sheet: fuel consumption, equipment and features

### Supported Screen Sizes

| Platform | Minimum supported | Designed at |
|---|---|---|
| Desktop (web) | 1280×720 | — |
| Mobile | 360×780 | 390×844 |

Sizes are in logical pixels. Below the minimum the layout keeps working, without guarantees. The desktop app's window opens at 1280×720 when the screen has room, and otherwise at what fits above the taskbar, down to 1280×640, so on a 1366×768 notebook it fits whole in a window. See [AGENTS.md](AGENTS.md#supported-screen-sizes) for the reasoning.

### Tech Stack

A **pnpm** + **Turborepo** monorepo:

| Package | What it is |
|---|---|
| `apps/web` | Web app — React 19, Vite 8, Tailwind CSS 4, React Router 8 and Storybook 10 |
| `apps/mobile` | Mobile app — React Native 0.88 |
| `apps/desktop` | Windows desktop app — Electron 44 with the web build, packaged by electron-builder |
| `apps/api` | API — Fastify 5, Zod, Prisma 7 on SQLite or PostgreSQL, with sharp to reduce the photos and make their thumbnails |
| `packages/shared` | Zod schemas, rules, types and design tokens shared by web, mobile and API |

The [architecture overview](docs/architecture.md) shows how these parts fit together and the technologies each one uses, and the [database diagram](docs/database.md) shows the tables and how they relate.

Each component keeps its look in a style recipe beside it (`<Component>.styles.ts`), built from the theme tokens, which also gives every element its style id. Lint fails when a component writes a style or an id by hand.

Web tests are written in TypeScript: component tests with **Vitest Browser Mode**, which runs them in Chromium, and end-to-end tests with **Playwright**, at 1280×720 and 360×780. The mobile app is tested with **Jest** and `react-test-renderer`. See [AGENTS.md](AGENTS.md#testing) for the rules every test follows, and [docs/testing.md](docs/testing.md) for how to run the tests, read their reports and keep them up.

CI (GitHub Actions) runs lint, typecheck, build, the unit and component tests and the Playwright E2E tests on every pull request, and builds an empty database from the migrations.

### Getting Started

**Requirements:** Node.js 22.11 or newer and pnpm 12 (`corepack enable` picks the right version). The database is a SQLite file by default, with nothing to install; PostgreSQL works too, set in `DATABASE_URL` (see [docs/database.md](docs/database.md#sqlite)).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # SQLite by default; set DATABASE_URL for PostgreSQL
pnpm --filter @apc/api db:migrate         # creates the database tables
pnpm --filter @apc/api db:seed            # adds the test users, the default lists and sample items
pnpm dev                                  # API on :3333, web on :5173 (the desktop app's server is on :3000)
```

Users live in the database: the seed adds the test users from `packages/shared/src/auth/testUsers.ts`, such as `christian.camilo` / `opala4100` (test values only), and anyone can create an account with "Criar conta" on the login, giving a name, a username, an e-mail (only kept for now) and a password. Passwords are stored hashed. A login or sign-up starts a session: the API answers a token, which the app keeps on the device (localStorage on the web and the desktop, the keychain on the phone) and sends on every call. Every route but the health check, the login and the sign-up refuses a call without a live session, and the database keeps only the token's hash. A session lasts 7 days from its last use and ends on "Sair"; when it expires, the app goes back to the login and says so. Five wrong passwords for a username lock it from that address for 15 minutes, and an address gets 30 logins and 10 sign-ups every 15 minutes; past that, the login and the sign-up say how many minutes to wait. Photos load at paths the API signs for the session, since an image can't send the token.

Before the first test run, download the browser that the component and E2E tests use:

```bash
pnpm --filter @apc/web exec playwright install chromium
```

| Command | What it does |
|---|---|
| `pnpm dev` | Runs every app in development mode |
| `pnpm build` | Builds every package |
| `pnpm lint` | Lints every package |
| `pnpm typecheck` | Typechecks the code the build doesn't check (API and shared tests, mobile) |
| `pnpm test` | Runs the unit and component tests (shared, API, web in Chromium, mobile) |
| `pnpm test:e2e` | Runs the web E2E tests at 1280×720 and 360×780 (starts the API and the web app) |
| `pnpm --filter @apc/api start` | Starts the built API with Node (run `pnpm build` first) |
| `pnpm --filter @apc/web test:e2e:ui` | Opens the Playwright UI to run and debug the tests |
| `pnpm --filter @apc/web storybook` | Opens Storybook on :6006, with the design system foundations, components and screen mockups. Every merge that changes the web app or the shared package publishes it on GitHub Pages, in `/storybook/` (`.github/workflows/pages.yml`) |
| `pnpm --filter @apc/web build:demo` | Builds the web app's demo, which answers its API in the browser, in `apps/web/dist-demo/`; GitHub Pages publishes it in `/demo/` with the Storybook |
| `pnpm --filter @apc/web test:e2e:demo` | Runs the demo's E2E tests on the Pages site put together in `site/` (`demo/` from the demo's build, with `docs/site/404.html`), as Pages serves it |
| `pnpm --filter @apc/mobile start` | Starts the React Native bundler |
| `pnpm --filter @apc/mobile android` | Runs the mobile app on Android |
| `pnpm --filter @apc/api photos:compress` | Reduces the photos stored before photos were reduced on saving (run once; safe to run again) |
| `pnpm --filter @apc/desktop dev` | Opens the desktop app on the web dev server (run `pnpm dev` too) |
| `pnpm --filter @apc/desktop dist` | Builds the Windows installer and the portable exe in `apps/desktop/release/` |
| `pnpm --filter @apc/desktop test:e2e` | Runs the desktop app's smoke test (build the web app and the desktop app first) |

### Running at Home

The server comes inside the desktop app: installed on a Windows computer at home, the app runs it for the phone app on the same Wi-Fi, with nothing else to install or turn on. The [home server guide](docs/home-server.md) has every step: installing, picking the database, the firewall, the computer's address, the phone, backups, importing an old server and moving off a clone, as the server ran up to v0.3.0. It is for the home network only.

### Desktop App

`apps/desktop` packages the web app as a Windows program with Electron. The shop installs it and opens it like any other app, without a browser.

- **Build:** `pnpm --filter @apc/desktop dist` builds the web app and writes `APC-Universal-Repair-Setup-<version>.exe` (installer, with desktop and Start menu shortcuts) and a portable exe to `apps/desktop/release/`. The builds are unsigned.
- **Publishing a version:** versions are published on demand as [GitHub Releases](https://github.com/ChrisCamilo/apc-universal-repair/releases), never on their own. Raise `version` in `apps/desktop/package.json`, `apps/api/package.json` and `apps/mobile/package.json` to the same one (e.g. `0.2.0` → `0.2.1`), and add the notes in `docs/releases/v<version>.md`, in a pull request. The phone app's Android build takes its version from `apps/mobile/package.json`. Merge it, then run *Actions → Desktop → Run workflow* on `main`. The workflow builds and smoke-tests the app and creates the release `v<version>` on that commit, with those notes, the installer, `latest.yml` and the blockmap (what the updater reads) and the portable exe. A version already released, or different versions in the three apps, are refused. Pull requests only run the desktop smoke test.
- **Installing from a release:** download `APC-Universal-Repair-Setup-<version>.exe` from the release. A computer with v0.1.0, which has no updater, needs v0.2.0 installed once by hand, over it; every later version arrives by itself.
- **Updates:** the installed app updates itself from the GitHub Releases. When it opens, and every 6 hours while it stays open, it looks for a newer version and downloads it in the background, only what changed. Then a notice says *Nova versão X pronta. Ela será instalada quando você fechar o app.*: the new version goes in when the app closes, or right away with *Reiniciar agora*, which shows *Atualizando o APC…*, then the installer's window with its progress, *Atualizando o APC*, and opens the new version by itself, and the session and preferences are kept. A server that doesn't start after an update is said so on screen, with why: see [the home server guide](docs/home-server.md#9-after-an-update-the-server-doesnt-connect). Without internet the app keeps working on its version. The portable exe and development runs don't update: download the new portable exe instead.
- **About this version:** *Sobre esta versão*, in the user menu, shows the version in use and its release notes in Portuguese, from `docs/releases/v<version>.md`, with a link to every release on GitHub, which opens in the browser. The web build takes the version and the notes in (`virtual:apc-release` in `apps/web/vite.config.ts`), so they show offline.
- **The server comes with the app:** the installer brings the API, and the app runs it on port 3000 for the phone, apart from the 3333 of a development API (`pnpm dev`); when another program holds that port, the app names it and offers another port, chosen in *Servidor e banco de dados* ([guide](docs/home-server.md#10-the-port-is-in-use)), with its data in `%APPDATA%\APC Universal Repair\data` (the SQLite file and the photos) and its log in `logs\api.log`. There is no clone, Node or pnpm to install. An update of the app updates the server and applies its migrations, so the two are always on the same version. The server answers only this computer until *Acesso pelo celular* is turned on in *Servidor e banco de dados*, which puts it on the network for the phone; Windows then asks whether APC may use the network: allow it on private networks only. While the access is on, the dialog warns when the network is set to Public or a firewall rule lets APC in on public networks. Closing the window hides the app in the tray, by the clock, with the server still on. The tray's menu opens the app, shows the phone's address while the access is on (a click copies it), turns *Iniciar com o Windows* on and off, and quits with *Sair*, which turns the server off. The installer asks whether the app starts with Windows, hidden in the tray with its server on (yes by default), or only when opened.
- **The database:** a fresh install asks, on its *Banco de dados* page, which database the server uses, each choice saying why to pick it. **SQLite**, the default, keeps the data in a file in `%APPDATA%\APC Universal Repair\data`, encrypted with a key Windows keeps for the app, and needs nothing installed. The first time, the app shows the key's recovery copy to keep away from the computer: without it, a copy of the file opens nowhere else. **PostgreSQL** is for whoever already runs one: on its first start the app asks for its address, checks it connects, creates the tables in an empty database, and only then starts the server. An update or an install over the app keeps the choice and skips the page. *Servidor e banco de dados*, on the login screen, in the user menu and in the tray's menu, shows the database in use, the photos' folder, the port and, with the phone's access on, the phone's address, and changes the database later. PostgreSQL's address holds a password, so `config.json` keeps it only sealed by Windows (DPAPI, through Electron's `safeStorage`), readable by this Windows user alone. Switching doesn't move the data.
- **Importing an old server:** *Importar dados de outro servidor*, in the same dialog, brings an old server's data and photos into the database in use while it is empty, before anyone signs up, as the app offers on opening until then: from an old clone's PostgreSQL address or SQLite file (`apps\api\data\apc.db`), with its photos folder (`apps\api\uploads\photos`). A database of an earlier version is updated first, once you agree. The server is off during the copy, and the dialog lists each table's rows on both sides. See the [home server guide](docs/home-server.md#7-importing-an-old-server).
- **Installing over the installed app:** a newer `Setup` can be run without uninstalling first. It upgrades the app in place, in the same folder and with the same shortcuts, keeping the data in `%APPDATA%\APC Universal Repair`. If the app is open, the installer asks to close it.
- **Uninstalling:** the uninstaller asks, on its *Dados do APC* page, whether to keep the data in `%APPDATA%\APC Universal Repair` or delete it, with the folder's size and *Abrir a pasta*. Keeping, the default, removes only the program, and installing again on the same computer and Windows user opens everything as it was. Deleting also removes that folder, the inventory, the users, the photos and the backups, with no undoing it, and asks again first, with *Não* as the default. On PostgreSQL the database stays in its server either way. An update or a silent uninstall keeps the data and asks nothing. See the [home server guide](docs/home-server.md#13-uninstalling-the-app).
- **Update safety:** the builds are unsigned, so the updater accepts a version with no publisher signature, after checking the file against the sha512 in the release's `latest.yml`. What keeps the updates safe is the GitHub account that publishes them, so it must have two-factor authentication on.
- **Icon:** `apps/desktop/build/icon.png` is the APC gauge at 512px. `scripts/make-icon.ps1` draws `build/icon.ico` from it, with every size Windows asks for (16 to 256px), for the installer, the exe and the window. Run it again when the artwork changes. A run from the clone (`dev`, the tests) uses a Windows id of its own, so it never takes the installed app's taskbar icon. If an APC window ever shows Electron's atom on the taskbar, delete the `Electron.lnk` left in the Start menu by a run from before v0.2.1.
- **SmartScreen:** Windows only checks files marked as downloaded from the internet, so an installer built on the same computer, or copied over by USB drive, opens without a warning. One downloaded from CI shows *Windows protected your PC*. Either choose *More info → Run anyway*, or unblock the file first, in *Properties → Unblock* or with:
  ```powershell
  Unblock-File ".\APC-Universal-Repair-Setup-0.1.0.exe"
  ```
- **A server on another computer:** to use one instead of the app's own, create `config.json` in `%APPDATA%\APC Universal Repair` with `{ "apiUrl": "http://192.168.0.10:3000" }`; `APC_API_URL` also sets it. The app then runs no server, and warns when that one answers another version on `/health`. In development (`pnpm --filter @apc/desktop dev`), the app uses the API that `pnpm dev` runs from the repo.

### Phone App (Android)

`apps/mobile` is the React Native app for Android. In development it talks to the API that `pnpm dev` runs, which the emulator reaches at `10.0.2.2:3333`. A release APK runs without Metro and talks to the server at home ([Running at Home](#running-at-home)) at the address it was built with.

1. **The Android SDK:** install Android Studio, which brings the SDK. Set the user variable `ANDROID_HOME` to it (`%LOCALAPPDATA%\Android\Sdk` on Windows) and add its `platform-tools` and `emulator` folders to the `PATH`. In the SDK Manager (*SDK Tools*, with *Show Package Details*), install NDK `27.1.12297006`, the one React Native asks for, and CMake `3.31.6`, whose ninja handles the long paths of the monorepo on Windows. It needs a JDK 17 or newer in `JAVA_HOME`.
2. **The upload key,** made once and kept out of the repository, with a backup: without it, a new version can't update the installed app.
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore apc-upload.keystore -alias apc-upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   Then point Gradle at it in `%USERPROFILE%\.gradle\gradle.properties` (`~/.gradle/gradle.properties`), or in environment variables of the same names:
   ```properties
   APC_UPLOAD_STORE_FILE=C:/Users/<you>/keys/apc-upload.keystore
   APC_UPLOAD_STORE_PASSWORD=<the keystore's password>
   APC_UPLOAD_KEY_ALIAS=apc-upload
   APC_UPLOAD_KEY_PASSWORD=<the key's password>
   ```
   Without them, the release is signed with the debug key, and Gradle warns: it installs, but can't update an app signed with the upload key.
3. **The server's address:** the one the desktop app shows in *Servidor e banco de dados* with *Acesso pelo celular* on, such as `http://192.168.0.10:3000`. Put it in `apc.apiUrl` in the same `gradle.properties`, or in `APC_API_URL` in the environment, which wins. The build writes it into the app, so another address needs another build. With `http://`, the release allows plain HTTP to it; with `https://`, it doesn't. A release built without an address stops and says so.
4. **Build and install:**
   ```bash
   pnpm --filter @apc/mobile android:apk      # apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   pnpm --filter @apc/mobile android:aab      # app-release.aab, for the Play Store (not published)
   pnpm --filter @apc/mobile android:install  # installs the APK on the phone or emulator adb sees
   ```

- **Version:** `apps/mobile/package.json`'s, the same as the desktop app's (see *Publishing a version*). The version code Android compares on an update is `major*10000 + minor*100 + patch`, unless `APC_VERSION_CODE` sets it.
- **CI:** the *Android* workflow builds the release APK, with the address in the repository variable `APC_API_URL`. On pull requests that touch the phone app it only checks the APK builds; run by hand (*Actions → Android → Run workflow*), it also uploads it as an artifact, kept 14 days. With the secrets `ANDROID_UPLOAD_KEYSTORE_BASE64` (the keystore in base64), `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` and `ANDROID_UPLOAD_KEY_PASSWORD`, it signs with the upload key; without them, with the debug key, and the artifact's name ends in `-debug-signed`.
- **Licenses:** `./gradlew :app:writeLicenses`, in `apps/mobile/android`, writes the release's Android libraries and their licenses to `licenses.json`, which the notices and the license check read. Run it, then `pnpm licenses:write`, after adding or upgrading a native module; the workflow fails when the file is out of date.
- **Icon:** the APC gauge, as an adaptive icon (`res/mipmap-anydpi-v26`). The PNGs for Android 7 come from `apps/mobile/scripts/make-icon.ps1`.

### Roadmap

Work is organized in epics, tracked as [GitHub issues](https://github.com/ChrisCamilo/apc-universal-repair/issues?q=label%3Aepic).

- **MVP ✅:** Setup → Design System → Auth (login and sign-up) → Dashboard → Inventory (with photos, CSV import and export)
- **Optimizations ✅:** style recipes and style ids in every component, guarded by lint
- **Phase 2 (in progress):** Catalog tab ✅ (on sample data, shown as a work in progress)
- **Phase 3 (in progress):** notifications and toasts — toast kinds ✅, the bell ✅, the toast's duration ✅, low-stock warnings ✅, Windows notifications ✅ and Android notifications
- **Next:** the API on a home computer for the mobile app ✅, Windows desktop app ✅, photo compression ✅ and Android release build
- **Later:** 3D viewer, maintenance specs, diagnostics, reference prices, real backend and full EN/PT-BR app UI
- **TBD:** Car Specs, the vehicle spec sheet (fuel consumption, equipment and features), with no phase yet

### Delivery

The MVP was estimated at 228 story points. It closed on October 8, 2026, four weeks after the epics were opened, together with the phase 2 Catalog tab and the style refactor:

| Epic | Tasks done | Story points |
|---|---|---|
| Design System | 27 | 130 |
| Auth | 6 | 21 |
| Dashboard (with the Catalog tab) | 6 | 31 |
| Inventory | 18 | 96 |
| Optimizations | 9 | 43 |
| **Total** | **66** | **321** |

Since then the API at home, the Windows desktop app and the photo compression are done too. Still open: the Android release build, the home server checks that need an administrator and the style values left for a decision. The Car Specs epic is TBD, with no phase yet.

### Contributing

Commit messages, branch names, epics and task conventions are defined in [AGENTS.md](AGENTS.md). Every task has an estimate, priority, size, assignee, its epic and the tasks that block it. Outside contributions are only taken with a signed assignment of their rights (CLA), so the code keeps one author.

### License

All rights reserved. The code is public to be read and evaluated only: copying, using, changing or distributing it, in whole or in part, needs the author's written permission (see [LICENSE](LICENSE)). The third-party software it ships keeps its own licenses, listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); the audit of every package's license is in [docs/licenses.md](docs/licenses.md).

### Goal

Help mechanics, enthusiasts, and vehicle owners preserve correct maintenance practices by making original technical data easily accessible and visual.

### Status

🚧 In development: the MVP is done on web and mobile — login and sign-up, the Dashboard and the Inventory — and phase 2 is underway, with the Catalog tab built on sample data.

---

## 🇧🇷 Português (Brasil)

### Sobre o Projeto

O **APC Universal Repair** é um catálogo de veículos separados por marca, onde você pode visualizar o modelo 3D de cada veículo e saber como cada parte foi originalmente colocada. A ideia é preservar as boas práticas de manutenção, oferecendo acesso à ficha técnica do veículo — medidas de parafusos, torque, código original da peça, possíveis diagnósticos e valores de referência, quando possível.

Ele também inclui um **estoque de peças**, para a oficina controlar as peças que tem e descobrir, pelo código de uma peça, em quais veículos ela serve.

🌐 **Experimente no navegador:** a [demo interativa](https://chriscamilo.github.io/apc-universal-repair/demo/) é o app web de verdade no [GitHub Pages](https://chriscamilo.github.io/apc-universal-repair/), já logado, com o estoque de uma oficina de exemplo: busque, cadastre, edite e importe peças, e navegue pelo Catálogo. Ela não precisa de servidor: tudo fica no seu navegador e volta ao início ao recarregar. O [design system e as telas](https://chriscamilo.github.io/apc-universal-repair/storybook/?path=/story/screens--dashboard&panel=false) também estão lá, no Storybook, nos 4 estilos, de dia e de noite (a barra do topo troca).

### Funcionalidades

**MVP ✅ (pronto, na web e no celular)**

- 🔐 Login e cadastro de conta (nome, usuário, e-mail e senha), com os usuários guardados no banco e as senhas em hash, sessões conferidas pela API em toda chamada, e um aviso de senha esquecida dizendo a quem pedir
- 🗂️ Dashboard com abas que podem ser arrastadas para outra ordem, e um menu do usuário com o estilo visual, o modo escuro, as preferências da lista, o tutorial e a saída
- 📦 Estoque de peças: adicionar, ver, editar e excluir peças, cada uma com categoria, os veículos em que serve (cada um uma marca de veículo e, se quiser, o modelo), posição, lado, estoque mínimo e os códigos originais da montadora, feita por uma ou mais marcas de peça, cada uma com o próprio código da peça, cor, local, quantidade, valor unitário (R$) e fotos
- 👯 *Duplicar*, nos detalhes de uma peça, abre uma peça nova preenchida como cópia dela, com ou sem cópias das fotos, os códigos em branco e o estoque zerado
- 🏷️ Categorias, marcas de peça e modelos de veículo criados direto no formulário do item, e renomeados, juntados ou excluídos nas próprias listas
- 🔢 Um código de peça já usado é apontado enquanto é digitado, sem levar em conta maiúsculas, espaços e separadores ("CB4500" é "CB-4500")
- 🧭 Busca no estoque por nome ou código da peça, filtros, ordenação em todas as colunas e paginação (25, 50 ou 100 por página)
- 🚦 Linhas com estoque baixo e esgotado destacadas por cor
- 🖼️ Até 3 fotos por peça, com visualizador em tamanho grande
- 📄 Importação de peças em lote por CSV, as linhas das marcas de um item agrupadas pela coluna "item", os veículos dele em "vehicles" e os códigos originais em "original_codes", e exportação da lista (todas as páginas, com o caminho das fotos se quiser) no mesmo formato
- 🎓 Tutorial guiado na primeira vez que a aba Estoque é aberta, disponível de novo no menu do usuário
- 🎨 Quatro estilos visuais — **Anos 80**, **GT4**, **BMW 90** e **Fiat 90** — cada um com modo claro e escuro; de dia cada um é tingido no seu próprio tom (areia, azul-aço, cinza-avermelhado e sálvia), sem painéis brancos

**Redesign para celular (em andamento)**

- 📱 Um layout de celular, na web e no app nativo, com as abas numa barra inferior, seguidas de Alertas e Conta ✅
- 🔑 Login e cadastro diagramados para o celular ✅
- 🃏 O Estoque como uma lista de cards que carrega mais itens ao rolar ✅
- 🧾 Filtros, ordenação e as outras ações em bottom sheets, diálogos abrindo em tela cheia, e botões, campos e chips do tamanho do toque ✅
- 🚧 Ainda falta diagramar para o celular: os detalhes e o formulário de um item em tela cheia, os diálogos das listas, do CSV e do Sobre, o tutorial do Estoque e a aba Catálogo

**Fase 2 (em andamento)**

- 📚 Catálogo de veículos organizado por marca, modelo, geração, versão, ano e motor, com dados de exemplo ✅
- 🔎 Busca no catálogo por marca, modelo ou código de uma peça do estoque ✅
- 🚧 Até a fase 2 terminar, a aba Catálogo aparece em construção: ela abre desfocada atrás de um aviso de que ainda não está pronta

**Fase 3**

- 🎨 Avisos (toasts) por tipo: verde para sucesso, vermelho para erro, azul para informação e amarelo para aviso, cada um com seu ícone ✅
- 🔔 Um sino ao lado do menu do usuário com as últimas notificações, guardadas para cada usuário ✅
- ⏱️ O tempo do aviso, 5 s por padrão, ajustado de 2 s a 15 s no menu do sino ✅
- 📉 Avisos de peças no estoque mínimo ou abaixo dele, uma vez enquanto continuam baixas ✅
- 🪟 Erros e avisos como notificações do Windows no app desktop, enquanto a janela está em segundo plano ✅
- 📱 O mesmo como notificações do Android no celular

**Próximos passos**

- 🗜️ Fotos reduzidas ao serem salvas: a web e o celular diminuem antes de enviar, e a API guarda como WebP de até 1600px sem dados de localização, então uma foto acima de 3 MB também pode ser adicionada ✅
- 🏠 A API rodando num computador de casa, para o app do celular na mesma rede Wi-Fi, ligada por um atalho na área de trabalho ou em segundo plano ✅
- 🖥️ App desktop para Windows, que liga o servidor sozinho quando ele não está rodando ✅
- 🔄 O app desktop se atualizando sozinho pelas GitHub Releases ✅
- 🔁 O servidor em casa acompanhando a versão do app desktop ✅
- 📱 Build de release para Android, assinado com a chave de upload, gerado pelo CI ✅
- 🔐 Sessões conferidas em toda chamada, tentativas de login e cadastro limitadas, e o arquivo SQLite criptografado em disco ✅
- 🔗 O celular pareado com o servidor de casa por HTTPS, com um QR code, e cada aparelho novo autorizado no computador do servidor
- 📲 O app do celular avisando quando sai uma versão nova
- 🏷️ Um estoque novo começando com as categorias e marcas de peça de costume

**Depois**

- 🧩 Modelos 3D interativos dos veículos
- 🔩 Referência de montagem original de cada peça
- ⚙️ Ficha técnica: medidas de parafusos e torque
- 🔍 Orientação para diagnósticos comuns
- 💰 Valores de referência, quando disponíveis

**A definir**

- 📋 Ficha técnica do veículo: consumo, equipamentos e itens de série

### Tamanhos de Tela Suportados

| Plataforma | Mínimo garantido | Desenhado em |
|---|---|---|
| Desktop (web) | 1280×720 | — |
| Celular | 360×780 | 390×844 |

Os tamanhos são em pixels lógicos. Abaixo do mínimo o layout continua funcionando, mas sem garantia. A janela do app desktop abre em 1280×720 quando a tela tem espaço, ou no que cabe acima da barra de tarefas, até 1280×640, então num notebook de 1366×768 ela cabe inteira em modo janela. O motivo de cada número está no [AGENTS.md](AGENTS.md#supported-screen-sizes).

### Tecnologias

Monorepo com **pnpm** + **Turborepo**:

| Pacote | O que é |
|---|---|
| `apps/web` | App web — React 19, Vite 8, Tailwind CSS 4, React Router 8 e Storybook 10 |
| `apps/mobile` | App para celular — React Native 0.88 |
| `apps/desktop` | App desktop para Windows — Electron 44 com o build da web, empacotado pelo electron-builder |
| `apps/api` | API — Fastify 5, Zod, Prisma 7 com SQLite ou PostgreSQL, e sharp para reduzir as fotos e fazer as miniaturas |
| `packages/shared` | Schemas Zod, regras, tipos e tokens do design system compartilhados entre web, celular e API |

A [visão geral da arquitetura](docs/architecture.md#-português-brasil) mostra como essas partes se encaixam e as tecnologias de cada uma, e o [diagrama do banco](docs/database.md#-português-brasil) mostra as tabelas e como se relacionam.

Cada componente guarda a aparência numa receita de estilo ao lado dele (`<Componente>.styles.ts`), feita com os tokens do tema, que também dá o id de estilo de cada elemento. O lint falha quando um componente escreve um estilo ou um id à mão.

Os testes da web são escritos em TypeScript: testes de componente com o **Vitest Browser Mode**, que os roda no Chromium, e testes de ponta a ponta com o **Playwright**, em 1280×720 e 360×780. O app do celular é testado com **Jest** e `react-test-renderer`. As regras que todo teste segue estão no [AGENTS.md](AGENTS.md#testing), e como rodar os testes, ler os relatórios e mantê-los está em [docs/testing.md](docs/testing.md).

O CI (GitHub Actions) roda lint, checagem de tipos, build, os testes unitários e de componente e os testes E2E do Playwright em todo pull request, e monta um banco vazio a partir das migrações.

### Como Rodar

**Requisitos:** Node.js 22.11 ou mais novo e pnpm 12 (`corepack enable` escolhe a versão certa). O banco é um arquivo SQLite por padrão, sem nada para instalar; o PostgreSQL também funciona, indicado no `DATABASE_URL` (veja [docs/database.md](docs/database.md#sqlite-1)).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # SQLite por padrão; ajuste o DATABASE_URL para o PostgreSQL
pnpm --filter @apc/api db:migrate         # cria as tabelas do banco
pnpm --filter @apc/api db:seed            # adiciona os usuários de teste, as listas padrão e itens de exemplo
pnpm dev                                  # API na porta 3333, web na 5173 (o servidor do app desktop fica na 3000)
```

Os usuários ficam no banco: o seed cadastra os usuários de teste de `packages/shared/src/auth/testUsers.ts`, como `christian.camilo` / `opala4100` (valores só de teste), e qualquer pessoa pode criar uma conta em "Criar conta" no login, informando nome, usuário, e-mail (só guardado por enquanto) e senha. As senhas são guardadas em hash. Um login ou cadastro abre uma sessão: a API responde um token, que o app guarda no aparelho (localStorage na web e no desktop, o keychain no celular) e envia em toda chamada. Toda rota, menos o health check, o login e o cadastro, recusa uma chamada sem uma sessão válida, e o banco guarda só o hash do token. Uma sessão dura 7 dias desde o último uso e termina no "Sair"; quando ela expira, o app volta para o login e avisa. Cinco senhas erradas para um usuário o bloqueiam a partir daquele endereço por 15 minutos, e um endereço tem 30 logins e 10 cadastros a cada 15 minutos; passando disso, o login e o cadastro dizem quantos minutos esperar. As fotos carregam por caminhos que a API assina para a sessão, já que uma imagem não consegue enviar o token.

Antes de rodar os testes pela primeira vez, baixe o navegador que os testes de componente e E2E usam:

```bash
pnpm --filter @apc/web exec playwright install chromium
```

| Comando | O que faz |
|---|---|
| `pnpm dev` | Roda todos os apps em modo de desenvolvimento |
| `pnpm build` | Gera o build de todos os pacotes |
| `pnpm lint` | Roda o lint em todos os pacotes |
| `pnpm typecheck` | Checa os tipos do código que o build não checa (testes da API e do shared, celular) |
| `pnpm test` | Roda os testes unitários e de componente (shared, API, web no Chromium, celular) |
| `pnpm test:e2e` | Roda os testes E2E da web em 1280×720 e 360×780 (sobe a API e o app web) |
| `pnpm --filter @apc/api start` | Sobe a API compilada com o Node (rode `pnpm build` antes) |
| `pnpm --filter @apc/web test:e2e:ui` | Abre a interface do Playwright para rodar e depurar os testes |
| `pnpm --filter @apc/web storybook` | Abre o Storybook na porta 6006, com as bases, os componentes e os mockups de tela do design system. Todo merge que muda o app web ou o pacote compartilhado o publica no GitHub Pages, em `/storybook/` (`.github/workflows/pages.yml`) |
| `pnpm --filter @apc/web build:demo` | Gera o build da demo do app web, que responde a API no navegador, em `apps/web/dist-demo/`; o GitHub Pages a publica em `/demo/` junto com o Storybook |
| `pnpm --filter @apc/web test:e2e:demo` | Roda os testes E2E da demo no site do Pages montado em `site/` (`demo/` do build da demo, com o `docs/site/404.html`), como o Pages o serve |
| `pnpm --filter @apc/mobile start` | Inicia o bundler do React Native |
| `pnpm --filter @apc/mobile android` | Roda o app no Android |
| `pnpm --filter @apc/api photos:compress` | Reduz as fotos guardadas antes de as fotos serem reduzidas ao salvar (rode uma vez; pode rodar de novo) |
| `pnpm --filter @apc/desktop dev` | Abre o app desktop sobre o servidor de desenvolvimento da web (rode também o `pnpm dev`) |
| `pnpm --filter @apc/desktop dist` | Gera o instalador para Windows e o exe portátil em `apps/desktop/release/` |
| `pnpm --filter @apc/desktop test:e2e` | Roda o smoke test do app desktop (gere antes o build da web e do app desktop) |

### Rodando em Casa

O servidor vem dentro do app desktop: instalado num computador Windows em casa, o app o roda para o app do celular na mesma rede Wi-Fi, sem mais nada para instalar nem ligar. O [guia do servidor em casa](docs/home-server.md#-português-brasil) tem todos os passos: instalação, escolha do banco, firewall, endereço do computador, celular, backup, importação de um servidor antigo e como sair de um clone, como o servidor rodava até a v0.3.0. Ele é só para a rede de casa.

### App Desktop

O `apps/desktop` empacota o app web como um programa para Windows com o Electron. A oficina instala e abre como qualquer outro programa, sem navegador.

- **Build:** o `pnpm --filter @apc/desktop dist` gera o build da web e grava em `apps/desktop/release/` o `APC-Universal-Repair-Setup-<versão>.exe` (instalador, com atalhos na área de trabalho e no menu Iniciar) e um exe portátil. Os builds não são assinados.
- **Publicar uma versão:** as versões são publicadas sob demanda como [GitHub Releases](https://github.com/ChrisCamilo/apc-universal-repair/releases), nunca sozinhas. Suba o `version` em `apps/desktop/package.json`, em `apps/api/package.json` e em `apps/mobile/package.json` para a mesma versão (ex.: `0.2.0` → `0.2.1`), e escreva as notas em `docs/releases/v<versão>.md`, num pull request. O build Android do app do celular tira a versão do `apps/mobile/package.json`. Faça o merge e rode *Actions → Desktop → Run workflow* na `main`. O workflow gera e testa o app e cria a release `v<versão>` nesse commit, com essas notas, o instalador, o `latest.yml` e o blockmap (o que o atualizador lê) e o exe portátil. Uma versão já publicada, ou versões diferentes nos três apps, são recusadas. Os pull requests rodam só o smoke test do app desktop.
- **Instalar de uma release:** baixe o `APC-Universal-Repair-Setup-<versão>.exe` da release. Um computador com a v0.1.0, que não tem atualizador, precisa da v0.2.0 instalada uma vez na mão, por cima dela; as versões seguintes chegam sozinhas.
- **Atualizações:** o app instalado se atualiza sozinho pelas GitHub Releases. Quando abre, e a cada 6 horas enquanto fica aberto, ele procura uma versão mais nova e a baixa em segundo plano, só o que mudou. Então um aviso diz *Nova versão X pronta. Ela será instalada quando você fechar o app.*: a versão nova entra quando o app fecha, ou na hora com *Reiniciar agora*, que mostra *Atualizando o APC…*, depois a janela do instalador com o andamento, *Atualizando o APC*, e abre a versão nova sozinho, e a sessão e as preferências são mantidas. Um servidor que não liga depois de uma atualização aparece na tela, com o motivo: veja o [guia do servidor em casa](docs/home-server.md#9-depois-de-atualizar-o-servidor-não-conecta). Sem internet o app continua funcionando na versão dele. O exe portátil e o app em desenvolvimento não se atualizam: baixe o exe portátil novo.
- **Sobre esta versão:** o *Sobre esta versão*, no menu do usuário, mostra a versão em uso e as notas dela em português, do `docs/releases/v<versão>.md`, com um link para todas as versões no GitHub, que abre no navegador. O build da web leva a versão e as notas junto (`virtual:apc-release` no `apps/web/vite.config.ts`), então elas aparecem sem internet.
- **O servidor vem com o app:** o instalador traz a API, e o app a roda na porta 3000 para o celular, separada da 3333 de uma API de desenvolvimento (`pnpm dev`); quando outro programa ocupa essa porta, o app diz qual e oferece outra porta, escolhida em *Servidor e banco de dados* ([guia](docs/home-server.md#10-a-porta-está-em-uso)), com os dados em `%APPDATA%\APC Universal Repair\data` (o arquivo SQLite e as fotos) e o log em `logs\api.log`. Não há clone, Node nem pnpm para instalar. Uma atualização do app atualiza o servidor e aplica as migrações dele, então os dois estão sempre na mesma versão. O servidor responde só a este computador até o *Acesso pelo celular* ser ligado no *Servidor e banco de dados*, o que o põe na rede para o celular; o Windows então pergunta se o APC pode usar a rede: permita só em redes privadas. Com o acesso ligado, o diálogo avisa quando a rede está como Pública ou uma regra do firewall libera o APC em redes públicas. Fechar a janela deixa o app na bandeja, perto do relógio, com o servidor ainda ligado. O menu da bandeja abre o app, mostra o endereço do celular enquanto o acesso está ligado (um clique copia), liga e desliga o *Iniciar com o Windows* e sai com *Sair*, que desliga o servidor. O instalador pergunta se o app liga com o Windows, escondido na bandeja com o servidor ligado (sim por padrão), ou só quando for aberto.
- **O banco de dados:** uma instalação nova pergunta, na página *Banco de dados*, qual banco o servidor usa, e cada opção diz por que escolhê-la. O **SQLite**, o padrão, guarda os dados num arquivo em `%APPDATA%\APC Universal Repair\data`, criptografado com uma chave que o Windows guarda para o app, e não precisa de nada instalado. Na primeira vez, o app mostra a cópia de recuperação da chave para guardar longe do computador: sem ela, uma cópia do arquivo não abre em nenhum outro lugar. O **PostgreSQL** é para quem já tem um: na primeira vez que abre, o app pede o endereço dele, confere se conecta, cria as tabelas num banco vazio, e só então liga o servidor. Uma atualização ou uma instalação por cima mantém a escolha e pula a página. O *Servidor e banco de dados*, na tela de login, no menu do usuário e no menu da bandeja, mostra o banco em uso, a pasta das fotos, a porta e, com o acesso pelo celular ligado, o endereço do celular, e troca o banco depois. O endereço do PostgreSQL tem uma senha, então o `config.json` só o guarda lacrado pelo Windows (DPAPI, pelo `safeStorage` do Electron), que só este usuário do Windows lê. Trocar não leva os dados.
- **Importar um servidor antigo:** o *Importar dados de outro servidor*, no mesmo diálogo, traz os dados e as fotos de um servidor antigo para o banco em uso enquanto ele está vazio, antes de alguém criar uma conta, como o app oferece ao abrir até lá: do endereço PostgreSQL ou do arquivo SQLite de um clone antigo (`apps\api\data\apc.db`), com a pasta das fotos dele (`apps\api\uploads\photos`). Um banco de uma versão anterior é atualizado antes, se você concordar. O servidor fica desligado durante a cópia, e o diálogo lista as linhas de cada tabela nos dois lados. Veja o [guia do servidor em casa](docs/home-server.md#7-importar-um-servidor-antigo).
- **Instalar por cima do app instalado:** um `Setup` mais novo pode ser rodado sem desinstalar antes. Ele atualiza o app no lugar, na mesma pasta e com os mesmos atalhos, mantendo os dados em `%APPDATA%\APC Universal Repair`. Se o app estiver aberto, o instalador pede para fechá-lo.
- **Desinstalar:** o desinstalador pergunta, na página *Dados do APC*, se mantém os dados em `%APPDATA%\APC Universal Repair` ou se os apaga, com o tamanho da pasta e o *Abrir a pasta*. Manter, o padrão, remove só o programa, e instalar de novo no mesmo computador e usuário do Windows abre tudo como estava. Apagar remove também essa pasta, o estoque, os usuários, as fotos e as cópias de segurança, sem como desfazer, e pergunta de novo antes, com o *Não* como padrão. No PostgreSQL o banco fica no servidor dele de qualquer forma. Uma atualização ou uma desinstalação silenciosa mantém os dados e não pergunta nada. Veja o [guia do servidor em casa](docs/home-server.md#13-desinstalar-o-app).
- **Segurança das atualizações:** os builds não são assinados, então o atualizador aceita uma versão sem assinatura de editor, depois de conferir o arquivo com o sha512 do `latest.yml` da release. O que mantém as atualizações seguras é a conta do GitHub que as publica, então ela precisa estar com a autenticação em dois fatores ligada.
- **Ícone:** o `apps/desktop/build/icon.png` é o velocímetro do APC em 512px. O `scripts/make-icon.ps1` gera dele o `build/icon.ico`, com todos os tamanhos que o Windows pede (de 16 a 256px), para o instalador, o exe e a janela. Rode de novo quando a arte mudar. Um app rodando do clone (`dev`, os testes) usa um id do Windows próprio, para nunca tomar o ícone da barra de tarefas do app instalado. Se uma janela do APC mostrar o átomo do Electron na barra de tarefas, apague o `Electron.lnk` que um app rodando do clone antes da v0.2.1 deixou no menu Iniciar.
- **SmartScreen:** o Windows só confere arquivos marcados como baixados da internet, então um instalador gerado no próprio computador, ou copiado por pendrive, abre sem aviso. Um baixado do CI mostra *O Windows protegeu o computador*. Escolha *Mais informações → Executar assim mesmo*, ou desbloqueie o arquivo antes, em *Propriedades → Desbloquear* ou com:
  ```powershell
  Unblock-File ".\APC-Universal-Repair-Setup-0.1.0.exe"
  ```
- **Um servidor em outro computador:** para usar um no lugar do servidor do app, crie o `config.json` em `%APPDATA%\APC Universal Repair` com `{ "apiUrl": "http://192.168.0.10:3000" }`; o `APC_API_URL` também define o endereço. O app então não roda servidor nenhum, e avisa quando esse responde outra versão no `/health`. Em desenvolvimento (`pnpm --filter @apc/desktop dev`), o app usa a API que o `pnpm dev` roda do repositório.

### App do Celular (Android)

O `apps/mobile` é o app React Native para Android. Em desenvolvimento, ele fala com a API que o `pnpm dev` roda, que o emulador alcança em `10.0.2.2:3333`. Um APK de release roda sem o Metro e fala com o servidor de casa ([Rodando em Casa](#rodando-em-casa)) no endereço com que foi gerado.

1. **O Android SDK:** instale o Android Studio, que traz o SDK. Defina a variável de usuário `ANDROID_HOME` com a pasta dele (`%LOCALAPPDATA%\Android\Sdk` no Windows) e coloque as pastas `platform-tools` e `emulator` dele no `PATH`. No SDK Manager (*SDK Tools*, com *Show Package Details*), instale o NDK `27.1.12297006`, o que o React Native pede, e o CMake `3.31.6`, cujo ninja aceita os caminhos longos do monorepo no Windows. Ele precisa de um JDK 17 ou mais novo no `JAVA_HOME`.
2. **A chave de upload,** criada uma vez e guardada fora do repositório, com uma cópia de segurança: sem ela, uma versão nova não consegue atualizar o app instalado.
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore apc-upload.keystore -alias apc-upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   Depois, aponte o Gradle para ela no `%USERPROFILE%\.gradle\gradle.properties` (`~/.gradle/gradle.properties`), ou em variáveis de ambiente com os mesmos nomes:
   ```properties
   APC_UPLOAD_STORE_FILE=C:/Users/<você>/keys/apc-upload.keystore
   APC_UPLOAD_STORE_PASSWORD=<a senha do keystore>
   APC_UPLOAD_KEY_ALIAS=apc-upload
   APC_UPLOAD_KEY_PASSWORD=<a senha da chave>
   ```
   Sem elas, o release é assinado com a chave de debug e o Gradle avisa: ele instala, mas não consegue atualizar um app assinado com a chave de upload.
3. **O endereço do servidor:** o que o app desktop mostra em *Servidor e banco de dados* com o *Acesso pelo celular* ligado, como `http://192.168.0.10:3000`. Coloque-o no `apc.apiUrl` do mesmo `gradle.properties`, ou no `APC_API_URL` do ambiente, que tem preferência. O build grava o endereço no app, então outro endereço pede outro build. Com `http://`, o release permite HTTP simples para ele; com `https://`, não. Um release gerado sem endereço para e avisa.
4. **Gerar e instalar:**
   ```bash
   pnpm --filter @apc/mobile android:apk      # apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   pnpm --filter @apc/mobile android:aab      # app-release.aab, para a Play Store (não publicado)
   pnpm --filter @apc/mobile android:install  # instala o APK no celular ou emulador que o adb vê
   ```

- **Versão:** a do `apps/mobile/package.json`, a mesma do app desktop (veja *Publicar uma versão*). O código de versão que o Android compara numa atualização é `major*10000 + minor*100 + patch`, a não ser que o `APC_VERSION_CODE` o defina.
- **CI:** o workflow *Android* gera o APK de release, com o endereço da variável de repositório `APC_API_URL`. Nos pull requests que mexem no app do celular, ele só confere que o APK é gerado; rodado à mão (*Actions → Android → Run workflow*), ele também o envia como artefato, guardado por 14 dias. Com os secrets `ANDROID_UPLOAD_KEYSTORE_BASE64` (o keystore em base64), `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` e `ANDROID_UPLOAD_KEY_PASSWORD`, ele assina com a chave de upload; sem eles, com a de debug, e o nome do artefato termina em `-debug-signed`.
- **Licenças:** o `./gradlew :app:writeLicenses`, em `apps/mobile/android`, grava as bibliotecas Android do release e as licenças delas no `licenses.json`, que os avisos e a checagem de licenças leem. Rode-o, e depois o `pnpm licenses:write`, ao adicionar ou atualizar um módulo nativo; o workflow falha quando o arquivo está desatualizado.
- **Ícone:** o medidor do APC, como ícone adaptável (`res/mipmap-anydpi-v26`). Os PNGs para o Android 7 vêm do `apps/mobile/scripts/make-icon.ps1`.

### Roadmap

O trabalho é organizado em épicos, acompanhados como [issues no GitHub](https://github.com/ChrisCamilo/apc-universal-repair/issues?q=label%3Aepic).

- **MVP ✅:** Setup → Design System → Auth (login e cadastro) → Dashboard → Estoque (com fotos, importação e exportação por CSV)
- **Otimizações ✅:** receitas e ids de estilo em todos os componentes, garantidos pelo lint
- **Fase 2 (em andamento):** aba Catálogo ✅ (com dados de exemplo, aparecendo em construção)
- **Fase 3 (em andamento):** notificações e avisos — tipos de aviso ✅, o sino ✅, o tempo do aviso ✅, avisos de estoque baixo ✅, notificações do Windows ✅ e notificações do Android
- **Próximos passos:** a API num computador de casa para o app do celular ✅, app desktop para Windows ✅, compressão das fotos ✅ e build de release para Android
- **Depois:** visualizador 3D, ficha de manutenção, diagnósticos, valores de referência, backend real e interface completa em inglês e português
- **A definir:** Ficha técnica do veículo (consumo, equipamentos e itens de série), ainda sem fase

### Entregas

O MVP foi estimado em 228 story points. Ele foi concluído em 8 de outubro de 2026, quatro semanas depois de os épicos serem abertos, junto com a aba Catálogo da fase 2 e a reorganização dos estilos:

| Épico | Tasks concluídas | Story points |
|---|---|---|
| Design System | 27 | 130 |
| Auth | 6 | 21 |
| Dashboard (com a aba Catálogo) | 6 | 31 |
| Estoque | 18 | 96 |
| Otimizações | 9 | 43 |
| **Total** | **66** | **321** |

Depois disso, a API em casa, o app desktop para Windows e a compressão das fotos também ficaram prontos. Ainda em aberto: o build de release para Android, as checagens do servidor em casa que precisam de administrador e os valores de estilo que faltam decidir. O épico de Ficha técnica está a definir, ainda sem fase.

### Como Contribuir

Mensagens de commit, nomes de branch, épicos e convenções das tasks estão no [AGENTS.md](AGENTS.md). Toda task tem estimativa, prioridade, tamanho, responsável, o épico e as tasks que a bloqueiam. Contribuições de fora só são aceitas com uma cessão dos direitos delas assinada (CLA), para o código manter um só autor.

### Licença

Todos os direitos reservados. O código é público só para ser lido e avaliado: copiar, usar, alterar ou distribuir, no todo ou em parte, pede a autorização por escrito do autor (veja o [LICENSE](LICENSE)). Os softwares de terceiros que ele leva mantêm as próprias licenças, listadas no [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); a auditoria da licença de cada pacote está no [docs/licenses.md](docs/licenses.md).

### Objetivo

Ajudar mecânicos, entusiastas e proprietários de veículos a preservar as boas práticas de manutenção, tornando os dados técnicos originais acessíveis e visuais.

### Status

🚧 Em desenvolvimento: o MVP está pronto na web e no celular — login e cadastro, o Dashboard e o Estoque — e a fase 2 está em andamento, com a aba Catálogo feita sobre dados de exemplo.
