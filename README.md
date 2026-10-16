# APC Universal Repair

🇺🇸 [English (US)](#-english-us) | 🇧🇷 [Português (Brasil)](#-português-brasil)

---

## 🇺🇸 English (US)

### About the Project

**APC Universal Repair** is a vehicle catalog organized by brand, where you can view each vehicle's 3D model and learn how every part was originally assembled. The goal is to promote good maintenance practices by giving access to the vehicle's technical specifications — bolt and screw measurements, torque values, original part codes, possible diagnostics, and reference prices whenever available.

It also includes a **parts inventory**, so a workshop can keep track of the parts it has in stock and find, from a part's code, which vehicles it fits.

### Features

**MVP ✅ (done, on web and mobile)**

- 🔐 Login and account sign-up (name, username, e-mail and password), with the users kept in the database and the passwords stored hashed, sessions the API checks on every call, and a forgotten-password notice saying whom to ask
- 🗂️ Dashboard with tabs that can be dragged into a new order, and a user menu with the visual style, dark mode, the list preferences, the tutorial and logout
- 📦 Parts inventory: add, view, edit and delete parts, each with its part code, category, part brand, vehicle brand and model, position, side, color, location, quantity, minimum stock and unit price (R$)
- 🏷️ Categories, part brands and vehicle models created right from the item form, and renamed or deleted in their own lists
- 🔢 A part code already in use is flagged while it is typed, ignoring case, spaces and separators ("CB4500" is "CB-4500")
- 🧭 Inventory search by name or part code, filters, sorting on every column and pagination (25, 50 or 100 per page)
- 🚦 Low-stock and out-of-stock rows highlighted in color
- 🖼️ Up to 3 photos per part, with a large viewer
- 📄 Batch import of parts from CSV, and export of the list (every page, optionally with the photo paths) in the same format
- 🎓 Guided tutorial the first time the Inventory tab is opened, available again from the user menu
- 🎨 Four visual styles — **Anos 80**, **GT4**, **BMW 90** and **Fiat 90** — each with light and dark modes; by day each one is tinted in its own hue (sand, steel blue, warm grey-red and sage), with no white panels

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
- 📱 Android release build

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
| `apps/mobile` | Mobile app — React Native 0.87 |
| `apps/desktop` | Windows desktop app — Electron 44 with the web build, packaged by electron-builder |
| `apps/api` | API — Fastify 5, Zod, Prisma 7 on SQLite or PostgreSQL, with sharp to reduce the photos and make their thumbnails |
| `packages/shared` | Zod schemas, rules, types and design tokens shared by web, mobile and API |

The [architecture overview](docs/architecture.md) shows how these parts fit together and the technologies each one uses, and the [database diagram](docs/database.md) shows the tables and how they relate.

Each component keeps its look in a style recipe beside it (`<Component>.styles.ts`), built from the theme tokens, which also gives every element its style id. Lint fails when a component writes a style or an id by hand.

Web tests are written in TypeScript: component tests with **Vitest Browser Mode**, which runs them in Chromium, and end-to-end tests with **Playwright**, at 1280×720 and 360×780. The mobile app is tested with **Jest** and `react-test-renderer`. See [AGENTS.md](AGENTS.md#testing) for details.

CI (GitHub Actions) runs lint, typecheck, build, the unit and component tests and the Playwright E2E tests on every pull request, and builds an empty database from the migrations.

### Getting Started

**Requirements:** Node.js 22.11 or newer and pnpm 12 (`corepack enable` picks the right version). The database is a SQLite file by default, with nothing to install; PostgreSQL works too, set in `DATABASE_URL` (see [docs/database.md](docs/database.md#sqlite)).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # SQLite by default; set DATABASE_URL for PostgreSQL
pnpm --filter @apc/api db:migrate         # creates the database tables
pnpm --filter @apc/api db:seed            # adds the test users, the default lists and sample items
pnpm dev                                  # API on :3333, web on :5173
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
| `pnpm --filter @apc/web storybook` | Opens Storybook on :6006, with the design system foundations, components and screen mockups |
| `pnpm --filter @apc/mobile start` | Starts the React Native bundler |
| `pnpm --filter @apc/mobile android` | Runs the mobile app on Android |
| `pnpm --filter @apc/api start:home` | Applies the migrations and starts the API, as the home server does |
| `pnpm --filter @apc/api photos:compress` | Reduces the photos stored before photos were reduced on saving (run once; safe to run again) |
| `pnpm --filter @apc/desktop dev` | Opens the desktop app on the web dev server (run `pnpm dev` too) |
| `pnpm --filter @apc/desktop dist` | Builds the Windows installer and the portable exe in `apps/desktop/release/` |
| `pnpm --filter @apc/desktop test:e2e` | Runs the desktop app's smoke test (build the web app and the desktop app first) |

### Running at Home

The API and the database can run on a Windows computer at home, for the phone app on the same Wi-Fi and the desktop app on that computer. The server can be turned on by hand from the **Ligar servidor APC** desktop shortcut, or by a Task Scheduler task that starts it in the background. The clone on that computer stays on a release tag, and the desktop app brings it to its own version as it opens (`update-server.ps1`). The [home server guide](docs/home-server.md) has every step: installing, turning it on, the firewall, checking from the phone, backups and updates. It is for the home network only.

### Desktop App

`apps/desktop` packages the web app as a Windows program with Electron. The shop installs it and opens it like any other app, without a browser.

- **Build:** `pnpm --filter @apc/desktop dist` builds the web app and writes `APC-Universal-Repair-Setup-<version>.exe` (installer, with desktop and Start menu shortcuts) and a portable exe to `apps/desktop/release/`. The builds are unsigned.
- **Publishing a version:** versions are published on demand as [GitHub Releases](https://github.com/ChrisCamilo/apc-universal-repair/releases), never on their own. Raise `version` in `apps/desktop/package.json` and `apps/api/package.json` to the same one (e.g. `0.2.0` → `0.2.1`), and add the notes in `docs/releases/v<version>.md`, in a pull request. Merge it, then run *Actions → Desktop → Run workflow* on `main`. The workflow builds and smoke-tests the app and creates the release `v<version>` on that commit, with those notes, the installer, `latest.yml` and the blockmap (what the updater reads) and the portable exe. A version already released, or different versions in the two apps, are refused. Pull requests only run the desktop smoke test.
- **Installing from a release:** download `APC-Universal-Repair-Setup-<version>.exe` from the release. A computer with v0.1.0, which has no updater, needs v0.2.0 installed once by hand, over it; every later version arrives by itself. An app installed from a release doesn't know where the project's clone is, so to let it turn the server on, set `apiDir` once in `config.json` (see *API address* below), e.g. `{ "apiDir": "C:\\APC\\apc-universal-repair\\apps\\api" }`.
- **Updates:** the installed app updates itself from the GitHub Releases. When it opens, and every 6 hours while it stays open, it looks for a newer version and downloads it in the background, only what changed. Then a notice says *Nova versão X pronta. Ela será instalada quando você fechar o app.*: the new version goes in when the app closes, or right away with *Reiniciar agora*, and the session and preferences are kept. Without internet the app keeps working on its version. The portable exe and development runs don't update: download the new portable exe instead.
- **The server follows the app:** the web build in the app expects the API of the same version. When the installed app opens and the API on this computer answers another version on `/health`, it shows "Atualizando o servidor…" while `update-server.ps1` brings the clone to the app's release tag, and goes back if that fails. A server on another computer only gets a warning. See the [home server guide](docs/home-server.md#9-updating-to-a-new-version).
- **The database:** a fresh install asks, on its *Banco de dados* page, which database the server on this computer uses. **SQLite**, the default, keeps the data in a file and needs nothing installed. **PostgreSQL** is for whoever already runs one, and needs its address in `apps\api\.env` first. Each choice says why to pick it. The app keeps the choice in `config.json`; an update or an install over the app keeps it and skips the page. A `DATABASE_URL` in the `.env` always wins. Without one, the server uses the SQLite file; with PostgreSQL chosen and no address, the app opens the server guide instead of starting it.
- **Installing over the installed app:** a newer `Setup` can be run without uninstalling first. It upgrades the app in place, in the same folder and with the same shortcuts, keeping the data in `%APPDATA%\APC Universal Repair`. If the app is open, the installer asks to close it.
- **Update safety:** the builds are unsigned, so the updater accepts a version with no publisher signature, after checking the file against the sha512 in the release's `latest.yml`. What keeps the updates safe is the GitHub account that publishes them, so it must have two-factor authentication on.
- **Icon:** `apps/desktop/build/icon.png` is the APC gauge at 512px. `scripts/make-icon.ps1` draws `build/icon.ico` from it, with every size Windows asks for (16 to 256px), for the installer, the exe and the window. Run it again when the artwork changes. A run from the clone (`dev`, the tests) uses a Windows id of its own, so it never takes the installed app's taskbar icon. If an APC window ever shows Electron's atom on the taskbar, delete the `Electron.lnk` left in the Start menu by a run from before v0.2.1.
- **SmartScreen:** Windows only checks files marked as downloaded from the internet, so an installer built on the same computer, or copied over by USB drive, opens without a warning. One downloaded from CI shows *Windows protected your PC*. Either choose *More info → Run anyway*, or unblock the file first, in *Properties → Unblock* or with:
  ```powershell
  Unblock-File ".\APC-Universal-Repair-Setup-0.1.0.exe"
  ```
- **The server:** when the app opens and the API on this computer doesn't answer, it starts it in the background (the same way as the [home server guide](docs/home-server.md)) and shows "Ligando o servidor" until it answers. An API that is already running is left alone, and it keeps running after the app closes, so the phone keeps working.
- **API address:** `http://localhost:3333` by default. To use a server on another computer, create `config.json` in `%APPDATA%\APC Universal Repair` with `{ "apiUrl": "http://192.168.0.10:3333" }`; `APC_API_URL` also sets it. The app starts the server from the `apps/api` folder of the clone it was built from, or from `apiDir` in `config.json`.

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

Commit messages, branch names, epics and task conventions are defined in [AGENTS.md](AGENTS.md). Every task has an estimate, priority, size, assignee, its epic and the tasks that block it.

### Goal

Help mechanics, enthusiasts, and vehicle owners preserve correct maintenance practices by making original technical data easily accessible and visual.

### Status

🚧 In development: the MVP is done on web and mobile — login and sign-up, the Dashboard and the Inventory — and phase 2 is underway, with the Catalog tab built on sample data.

---

## 🇧🇷 Português (Brasil)

### Sobre o Projeto

O **APC Universal Repair** é um catálogo de veículos separados por marca, onde você pode visualizar o modelo 3D de cada veículo e saber como cada parte foi originalmente colocada. A ideia é preservar as boas práticas de manutenção, oferecendo acesso à ficha técnica do veículo — medidas de parafusos, torque, código original da peça, possíveis diagnósticos e valores de referência, quando possível.

Ele também inclui um **estoque de peças**, para a oficina controlar as peças que tem e descobrir, pelo código de uma peça, em quais veículos ela serve.

### Funcionalidades

**MVP ✅ (pronto, na web e no celular)**

- 🔐 Login e cadastro de conta (nome, usuário, e-mail e senha), com os usuários guardados no banco e as senhas em hash, sessões conferidas pela API em toda chamada, e um aviso de senha esquecida dizendo a quem pedir
- 🗂️ Dashboard com abas que podem ser arrastadas para outra ordem, e um menu do usuário com o estilo visual, o modo escuro, as preferências da lista, o tutorial e a saída
- 📦 Estoque de peças: adicionar, ver, editar e excluir peças, cada uma com código da peça, categoria, marca da peça, marca e modelo do veículo, posição, lado, cor, local, quantidade, estoque mínimo e valor unitário (R$)
- 🏷️ Categorias, marcas de peça e modelos de veículo criados direto no formulário do item, e renomeados ou excluídos nas próprias listas
- 🔢 Um código de peça já usado é apontado enquanto é digitado, sem levar em conta maiúsculas, espaços e separadores ("CB4500" é "CB-4500")
- 🧭 Busca no estoque por nome ou código da peça, filtros, ordenação em todas as colunas e paginação (25, 50 ou 100 por página)
- 🚦 Linhas com estoque baixo e esgotado destacadas por cor
- 🖼️ Até 3 fotos por peça, com visualizador em tamanho grande
- 📄 Importação de peças em lote por CSV, e exportação da lista (todas as páginas, com o caminho das fotos se quiser) no mesmo formato
- 🎓 Tutorial guiado na primeira vez que a aba Estoque é aberta, disponível de novo no menu do usuário
- 🎨 Quatro estilos visuais — **Anos 80**, **GT4**, **BMW 90** e **Fiat 90** — cada um com modo claro e escuro; de dia cada um é tingido no seu próprio tom (areia, azul-aço, cinza-avermelhado e sálvia), sem painéis brancos

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
- 📱 Build de release para Android

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
| `apps/mobile` | App para celular — React Native 0.87 |
| `apps/desktop` | App desktop para Windows — Electron 44 com o build da web, empacotado pelo electron-builder |
| `apps/api` | API — Fastify 5, Zod, Prisma 7 com SQLite ou PostgreSQL, e sharp para reduzir as fotos e fazer as miniaturas |
| `packages/shared` | Schemas Zod, regras, tipos e tokens do design system compartilhados entre web, celular e API |

A [visão geral da arquitetura](docs/architecture.md#-português-brasil) mostra como essas partes se encaixam e as tecnologias de cada uma, e o [diagrama do banco](docs/database.md#-português-brasil) mostra as tabelas e como se relacionam.

Cada componente guarda a aparência numa receita de estilo ao lado dele (`<Componente>.styles.ts`), feita com os tokens do tema, que também dá o id de estilo de cada elemento. O lint falha quando um componente escreve um estilo ou um id à mão.

Os testes da web são escritos em TypeScript: testes de componente com o **Vitest Browser Mode**, que os roda no Chromium, e testes de ponta a ponta com o **Playwright**, em 1280×720 e 360×780. O app do celular é testado com **Jest** e `react-test-renderer`. Os detalhes estão no [AGENTS.md](AGENTS.md#testing).

O CI (GitHub Actions) roda lint, checagem de tipos, build, os testes unitários e de componente e os testes E2E do Playwright em todo pull request, e monta um banco vazio a partir das migrações.

### Como Rodar

**Requisitos:** Node.js 22.11 ou mais novo e pnpm 12 (`corepack enable` escolhe a versão certa). O banco é um arquivo SQLite por padrão, sem nada para instalar; o PostgreSQL também funciona, indicado no `DATABASE_URL` (veja [docs/database.md](docs/database.md#sqlite-1)).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # SQLite por padrão; ajuste o DATABASE_URL para o PostgreSQL
pnpm --filter @apc/api db:migrate         # cria as tabelas do banco
pnpm --filter @apc/api db:seed            # adiciona os usuários de teste, as listas padrão e itens de exemplo
pnpm dev                                  # API na porta 3333, web na 5173
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
| `pnpm --filter @apc/web storybook` | Abre o Storybook na porta 6006, com as bases, os componentes e os mockups de tela do design system |
| `pnpm --filter @apc/mobile start` | Inicia o bundler do React Native |
| `pnpm --filter @apc/mobile android` | Roda o app no Android |
| `pnpm --filter @apc/api start:home` | Aplica as migrações e liga a API, como o servidor de casa faz |
| `pnpm --filter @apc/api photos:compress` | Reduz as fotos guardadas antes de as fotos serem reduzidas ao salvar (rode uma vez; pode rodar de novo) |
| `pnpm --filter @apc/desktop dev` | Abre o app desktop sobre o servidor de desenvolvimento da web (rode também o `pnpm dev`) |
| `pnpm --filter @apc/desktop dist` | Gera o instalador para Windows e o exe portátil em `apps/desktop/release/` |
| `pnpm --filter @apc/desktop test:e2e` | Roda o smoke test do app desktop (gere antes o build da web e do app desktop) |

### Rodando em Casa

A API e o banco podem rodar num computador Windows em casa, para o app do celular na mesma rede Wi-Fi e o app desktop nesse computador. O servidor pode ser ligado na mão pelo atalho **Ligar servidor APC** na área de trabalho, ou por uma tarefa do Agendador de Tarefas que o liga em segundo plano. O clone nesse computador fica numa tag de release, e o app desktop o leva para a versão dele ao abrir (`update-server.ps1`). O [guia do servidor em casa](docs/home-server.md#-português-brasil) tem todos os passos: instalação, como ligar, firewall, como conferir pelo celular, backup e atualização. Ele é só para a rede de casa.

### App Desktop

O `apps/desktop` empacota o app web como um programa para Windows com o Electron. A oficina instala e abre como qualquer outro programa, sem navegador.

- **Build:** o `pnpm --filter @apc/desktop dist` gera o build da web e grava em `apps/desktop/release/` o `APC-Universal-Repair-Setup-<versão>.exe` (instalador, com atalhos na área de trabalho e no menu Iniciar) e um exe portátil. Os builds não são assinados.
- **Publicar uma versão:** as versões são publicadas sob demanda como [GitHub Releases](https://github.com/ChrisCamilo/apc-universal-repair/releases), nunca sozinhas. Suba o `version` em `apps/desktop/package.json` e em `apps/api/package.json` para a mesma versão (ex.: `0.2.0` → `0.2.1`), e escreva as notas em `docs/releases/v<versão>.md`, num pull request. Faça o merge e rode *Actions → Desktop → Run workflow* na `main`. O workflow gera e testa o app e cria a release `v<versão>` nesse commit, com essas notas, o instalador, o `latest.yml` e o blockmap (o que o atualizador lê) e o exe portátil. Uma versão já publicada, ou versões diferentes nos dois apps, são recusadas. Os pull requests rodam só o smoke test do app desktop.
- **Instalar de uma release:** baixe o `APC-Universal-Repair-Setup-<versão>.exe` da release. Um computador com a v0.1.0, que não tem atualizador, precisa da v0.2.0 instalada uma vez na mão, por cima dela; as versões seguintes chegam sozinhas. Um app instalado de uma release não sabe onde está o clone do projeto, então, para ele poder ligar o servidor, defina o `apiDir` uma vez no `config.json` (veja *Endereço da API* abaixo), ex.: `{ "apiDir": "C:\\APC\\apc-universal-repair\\apps\\api" }`.
- **Atualizações:** o app instalado se atualiza sozinho pelas GitHub Releases. Quando abre, e a cada 6 horas enquanto fica aberto, ele procura uma versão mais nova e a baixa em segundo plano, só o que mudou. Então um aviso diz *Nova versão X pronta. Ela será instalada quando você fechar o app.*: a versão nova entra quando o app fecha, ou na hora com *Reiniciar agora*, e a sessão e as preferências são mantidas. Sem internet o app continua funcionando na versão dele. O exe portátil e o app em desenvolvimento não se atualizam: baixe o exe portátil novo.
- **O servidor acompanha o app:** o build da web no app espera a API da mesma versão. Quando o app instalado abre e a API deste computador responde outra versão no `/health`, ele mostra "Atualizando o servidor…" enquanto o `update-server.ps1` leva o clone para a tag da release do app, e volta atrás se não der certo. Um servidor em outro computador só gera um aviso. Veja o [guia do servidor em casa](docs/home-server.md#9-atualizar-para-uma-versão-nova).
- **O banco de dados:** uma instalação nova pergunta, na página *Banco de dados*, qual banco o servidor deste computador usa. O **SQLite**, o padrão, guarda os dados num arquivo e não precisa de nada instalado. O **PostgreSQL** é para quem já tem um, e precisa do endereço dele no `apps\api\.env` antes. Cada opção diz por que escolhê-la. O app guarda a escolha no `config.json`; uma atualização ou uma instalação por cima mantém a escolha e pula a página. Um `DATABASE_URL` no `.env` sempre vale mais. Sem ele, o servidor usa o arquivo SQLite; com o PostgreSQL escolhido e sem endereço, o app abre o guia do servidor em vez de ligá-lo.
- **Instalar por cima do app instalado:** um `Setup` mais novo pode ser rodado sem desinstalar antes. Ele atualiza o app no lugar, na mesma pasta e com os mesmos atalhos, mantendo os dados em `%APPDATA%\APC Universal Repair`. Se o app estiver aberto, o instalador pede para fechá-lo.
- **Segurança das atualizações:** os builds não são assinados, então o atualizador aceita uma versão sem assinatura de editor, depois de conferir o arquivo com o sha512 do `latest.yml` da release. O que mantém as atualizações seguras é a conta do GitHub que as publica, então ela precisa estar com a autenticação em dois fatores ligada.
- **Ícone:** o `apps/desktop/build/icon.png` é o velocímetro do APC em 512px. O `scripts/make-icon.ps1` gera dele o `build/icon.ico`, com todos os tamanhos que o Windows pede (de 16 a 256px), para o instalador, o exe e a janela. Rode de novo quando a arte mudar. Um app rodando do clone (`dev`, os testes) usa um id do Windows próprio, para nunca tomar o ícone da barra de tarefas do app instalado. Se uma janela do APC mostrar o átomo do Electron na barra de tarefas, apague o `Electron.lnk` que um app rodando do clone antes da v0.2.1 deixou no menu Iniciar.
- **SmartScreen:** o Windows só confere arquivos marcados como baixados da internet, então um instalador gerado no próprio computador, ou copiado por pendrive, abre sem aviso. Um baixado do CI mostra *O Windows protegeu o computador*. Escolha *Mais informações → Executar assim mesmo*, ou desbloqueie o arquivo antes, em *Propriedades → Desbloquear* ou com:
  ```powershell
  Unblock-File ".\APC-Universal-Repair-Setup-0.1.0.exe"
  ```
- **O servidor:** quando o app abre e a API deste computador não responde, ele a liga em segundo plano (do mesmo jeito que o [guia do servidor em casa](docs/home-server.md#-português-brasil)) e mostra "Ligando o servidor" até ela responder. Uma API que já está rodando fica como está, e ela continua ligada depois que o app fecha, para o celular continuar funcionando.
- **Endereço da API:** `http://localhost:3333` por padrão. Para usar um servidor em outro computador, crie o `config.json` em `%APPDATA%\APC Universal Repair` com `{ "apiUrl": "http://192.168.0.10:3333" }`; o `APC_API_URL` também define o endereço. O app liga o servidor a partir da pasta `apps/api` do clone em que foi gerado, ou do `apiDir` do `config.json`.

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

Mensagens de commit, nomes de branch, épicos e convenções das tasks estão no [AGENTS.md](AGENTS.md). Toda task tem estimativa, prioridade, tamanho, responsável, o épico e as tasks que a bloqueiam.

### Objetivo

Ajudar mecânicos, entusiastas e proprietários de veículos a preservar as boas práticas de manutenção, tornando os dados técnicos originais acessíveis e visuais.

### Status

🚧 Em desenvolvimento: o MVP está pronto na web e no celular — login e cadastro, o Dashboard e o Estoque — e a fase 2 está em andamento, com a aba Catálogo feita sobre dados de exemplo.
