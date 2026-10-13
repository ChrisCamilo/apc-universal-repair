# APC Universal Repair

🇺🇸 [English (US)](#-english-us) | 🇧🇷 [Português (Brasil)](#-português-brasil)

---

## 🇺🇸 English (US)

### About the Project

**APC Universal Repair** is a vehicle catalog organized by brand, where you can view each vehicle's 3D model and learn how every part was originally assembled. The goal is to promote good maintenance practices by giving access to the vehicle's technical specifications — bolt and screw measurements, torque values, original part codes, possible diagnostics, and reference prices whenever available.

It also includes a **parts inventory**, so a workshop can keep track of the parts it has in stock and find, from a part's code, which vehicles it fits.

### Features

**MVP ✅ (done, on web and mobile)**

- 🔐 Login and account sign-up (name, username, e-mail and password), with the users kept in the database and the passwords stored hashed, and a forgotten-password notice saying whom to ask
- 🗂️ Dashboard with tabs that can be dragged into a new order, and a user menu with the visual style, dark mode, the list preferences, the tutorial and logout
- 📦 Parts inventory: add, view, edit and delete parts, each with its part code, category, part brand, vehicle brand and model, position, side, color, location, quantity, minimum stock and unit price (R$)
- 🏷️ Categories, part brands and vehicle models created right from the item form, and renamed or deleted in their own lists
- 🔢 A part code already in use is flagged while it is typed, ignoring case, spaces and separators ("CB4500" is "CB-4500")
- 🧭 Inventory search by name or part code, filters, sorting on every column and pagination (25, 50 or 100 per page)
- 🚦 Low-stock and out-of-stock rows highlighted in color
- 🖼️ Up to 3 photos per part, with a large viewer
- 📄 Batch import of parts from CSV, and export of the list (every page, optionally with the photo paths) in the same format
- 🎓 Guided tutorial the first time the Inventory tab is opened, available again from the user menu
- 🎨 Four visual styles — **Anos 80**, **GT4**, **BMW 90** and **Fiat 90** — each with light and dark modes

**Phase 2 (in progress)**

- 📚 Vehicle catalog organized by brand, model, generation, version, year and engine, on sample data ✅
- 🔎 Catalog search by brand, model or the code of a part in stock ✅
- 🚧 Until phase 2 is done the Catalog tab shows as a work in progress: it opens blurred behind a notice that it isn't ready yet
- 📋 Vehicle spec sheet: fuel consumption, equipment and features

**Next**

- 🗜️ Photos compressed when they are saved
- 🏠 The API running on a home computer, for the mobile app on the same Wi-Fi, turned on by a desktop shortcut or in the background ✅
- 🖥️ Windows desktop app and Android release build

**Later**

- 🧩 Interactive 3D vehicle models
- 🔩 Original assembly reference for every part
- ⚙️ Technical specs: bolt/screw sizes and torque values
- 🔍 Diagnostic guidance for common issues
- 💰 Reference prices, when available

### Supported Screen Sizes

| Platform | Minimum supported | Designed at |
|---|---|---|
| Desktop (web) | 1280×720 | — |
| Mobile | 360×780 | 390×844 |

Sizes are in logical pixels. Below the minimum the layout keeps working, without guarantees. See [AGENTS.md](AGENTS.md#supported-screen-sizes) for the reasoning.

### Tech Stack

A **pnpm** + **Turborepo** monorepo:

| Package | What it is |
|---|---|
| `apps/web` | Web app — React 19, Vite 8, Tailwind CSS 4, React Router 8 and Storybook 10 |
| `apps/mobile` | Mobile app — React Native 0.87 |
| `apps/api` | API — Fastify 5, Zod, Prisma 7 on PostgreSQL, with sharp for the photo thumbnails |
| `packages/shared` | Zod schemas, rules, types and design tokens shared by web, mobile and API |

The [architecture overview](docs/architecture.md) shows how these parts fit together and the technologies each one uses, and the [database diagram](docs/database.md) shows the tables and how they relate.

Each component keeps its look in a style recipe beside it (`<Component>.styles.ts`), built from the theme tokens, which also gives every element its style id. Lint fails when a component writes a style or an id by hand.

Web tests are written in TypeScript: component tests with **Vitest Browser Mode**, which runs them in Chromium, and end-to-end tests with **Playwright**, at 1280×720 and 360×780. The mobile app is tested with **Jest** and `react-test-renderer`. See [AGENTS.md](AGENTS.md#testing) for details.

CI (GitHub Actions) runs lint, typecheck, build, the unit and component tests and the Playwright E2E tests on every pull request.

### Getting Started

**Requirements:** Node.js 22.11 or newer, pnpm 12 (`corepack enable` picks the right version) and a PostgreSQL database.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL
pnpm --filter @apc/api exec prisma migrate deploy   # creates the database tables
pnpm --filter @apc/api db:seed            # adds the test users, the default lists and sample items
pnpm dev                                  # API on :3333, web on :5173
```

Users live in the database: the seed adds the test users from `packages/shared/src/auth/testUsers.ts`, such as `christian.camilo` / `opala4100` (test values only), and anyone can create an account with "Criar conta" on the login, giving a name, a username, an e-mail (only kept for now) and a password. Passwords are stored hashed. Real sessions, with tokens, come with the real backend (EP-10).

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
| `pnpm --filter @apc/web test:e2e:ui` | Opens the Playwright UI to run and debug the tests |
| `pnpm --filter @apc/web storybook` | Opens Storybook on :6006, with the design system foundations, components and screen mockups |
| `pnpm --filter @apc/mobile start` | Starts the React Native bundler |
| `pnpm --filter @apc/mobile android` | Runs the mobile app on Android |
| `pnpm --filter @apc/api start:home` | Applies the migrations and starts the API, as the home server does |

### Running at Home

The API and the database can run on a Windows computer at home, for the phone app on the same Wi-Fi and the desktop app on that computer. The server can be turned on by hand from the **Ligar servidor APC** desktop shortcut, or by a Task Scheduler task that starts it in the background. The [home server guide](docs/home-server.md) has every step: installing, turning it on, the firewall, checking from the phone, backups and updates. It is for the home network only.

### Roadmap

Work is organized in epics, tracked as [GitHub issues](https://github.com/ChrisCamilo/apc-universal-repair/issues?q=label%3Aepic).

- **MVP ✅:** Setup → Design System → Auth (login and sign-up) → Dashboard → Inventory (with photos, CSV import and export)
- **Optimizations ✅:** style recipes and style ids in every component, guarded by lint
- **Phase 2 (in progress):** Catalog tab ✅ (on sample data, shown as a work in progress) and Car Specs
- **Next:** the API on a home computer for the mobile app ✅, photo compression, Windows desktop app and Android release build
- **Later:** 3D viewer, maintenance specs, diagnostics, reference prices, real backend and full EN/PT-BR app UI

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

Since then the API at home is done too. Still open: 4 tasks (20 points) — photo compression, the Windows desktop app, the Android release build and the style values left for a decision — plus the Car Specs epic.

### Contributing

Commit messages, branch names, epics and task conventions are defined in [AGENTS.md](AGENTS.md). Every task has an estimate, priority, size, assignee, its epic and the tasks that block it.

### Goal

Help mechanics, enthusiasts, and vehicle owners preserve correct maintenance practices by making original technical data easily accessible and visual.

### Status

🚧 In development: the MVP is done on web and mobile — login and sign-up, the Dashboard and the Inventory — and phase 2 is underway, with the Catalog tab built on sample data and the Car Specs next.

---

## 🇧🇷 Português (Brasil)

### Sobre o Projeto

O **APC Universal Repair** é um catálogo de veículos separados por marca, onde você pode visualizar o modelo 3D de cada veículo e saber como cada parte foi originalmente colocada. A ideia é preservar as boas práticas de manutenção, oferecendo acesso à ficha técnica do veículo — medidas de parafusos, torque, código original da peça, possíveis diagnósticos e valores de referência, quando possível.

Ele também inclui um **estoque de peças**, para a oficina controlar as peças que tem e descobrir, pelo código de uma peça, em quais veículos ela serve.

### Funcionalidades

**MVP ✅ (pronto, na web e no celular)**

- 🔐 Login e cadastro de conta (nome, usuário, e-mail e senha), com os usuários guardados no banco e as senhas em hash, e um aviso de senha esquecida dizendo a quem pedir
- 🗂️ Dashboard com abas que podem ser arrastadas para outra ordem, e um menu do usuário com o estilo visual, o modo escuro, as preferências da lista, o tutorial e a saída
- 📦 Estoque de peças: adicionar, ver, editar e excluir peças, cada uma com código da peça, categoria, marca da peça, marca e modelo do veículo, posição, lado, cor, local, quantidade, estoque mínimo e valor unitário (R$)
- 🏷️ Categorias, marcas de peça e modelos de veículo criados direto no formulário do item, e renomeados ou excluídos nas próprias listas
- 🔢 Um código de peça já usado é apontado enquanto é digitado, sem levar em conta maiúsculas, espaços e separadores ("CB4500" é "CB-4500")
- 🧭 Busca no estoque por nome ou código da peça, filtros, ordenação em todas as colunas e paginação (25, 50 ou 100 por página)
- 🚦 Linhas com estoque baixo e esgotado destacadas por cor
- 🖼️ Até 3 fotos por peça, com visualizador em tamanho grande
- 📄 Importação de peças em lote por CSV, e exportação da lista (todas as páginas, com o caminho das fotos se quiser) no mesmo formato
- 🎓 Tutorial guiado na primeira vez que a aba Estoque é aberta, disponível de novo no menu do usuário
- 🎨 Quatro estilos visuais — **Anos 80**, **GT4**, **BMW 90** e **Fiat 90** — cada um com modo claro e escuro

**Fase 2 (em andamento)**

- 📚 Catálogo de veículos organizado por marca, modelo, geração, versão, ano e motor, com dados de exemplo ✅
- 🔎 Busca no catálogo por marca, modelo ou código de uma peça do estoque ✅
- 🚧 Até a fase 2 terminar, a aba Catálogo aparece em construção: ela abre desfocada atrás de um aviso de que ainda não está pronta
- 📋 Ficha técnica do veículo: consumo, equipamentos e itens de série

**Próximos passos**

- 🗜️ Fotos comprimidas ao serem salvas
- 🏠 A API rodando num computador de casa, para o app do celular na mesma rede Wi-Fi, ligada por um atalho na área de trabalho ou em segundo plano ✅
- 🖥️ App desktop para Windows e build de release para Android

**Depois**

- 🧩 Modelos 3D interativos dos veículos
- 🔩 Referência de montagem original de cada peça
- ⚙️ Ficha técnica: medidas de parafusos e torque
- 🔍 Orientação para diagnósticos comuns
- 💰 Valores de referência, quando disponíveis

### Tamanhos de Tela Suportados

| Plataforma | Mínimo garantido | Desenhado em |
|---|---|---|
| Desktop (web) | 1280×720 | — |
| Celular | 360×780 | 390×844 |

Os tamanhos são em pixels lógicos. Abaixo do mínimo o layout continua funcionando, mas sem garantia. O motivo de cada número está no [AGENTS.md](AGENTS.md#supported-screen-sizes).

### Tecnologias

Monorepo com **pnpm** + **Turborepo**:

| Pacote | O que é |
|---|---|
| `apps/web` | App web — React 19, Vite 8, Tailwind CSS 4, React Router 8 e Storybook 10 |
| `apps/mobile` | App para celular — React Native 0.87 |
| `apps/api` | API — Fastify 5, Zod, Prisma 7 com PostgreSQL, e sharp para as miniaturas das fotos |
| `packages/shared` | Schemas Zod, regras, tipos e tokens do design system compartilhados entre web, celular e API |

A [visão geral da arquitetura](docs/architecture.md#-português-brasil) mostra como essas partes se encaixam e as tecnologias de cada uma, e o [diagrama do banco](docs/database.md#-português-brasil) mostra as tabelas e como se relacionam.

Cada componente guarda a aparência numa receita de estilo ao lado dele (`<Componente>.styles.ts`), feita com os tokens do tema, que também dá o id de estilo de cada elemento. O lint falha quando um componente escreve um estilo ou um id à mão.

Os testes da web são escritos em TypeScript: testes de componente com o **Vitest Browser Mode**, que os roda no Chromium, e testes de ponta a ponta com o **Playwright**, em 1280×720 e 360×780. O app do celular é testado com **Jest** e `react-test-renderer`. Os detalhes estão no [AGENTS.md](AGENTS.md#testing).

O CI (GitHub Actions) roda lint, checagem de tipos, build, os testes unitários e de componente e os testes E2E do Playwright em todo pull request.

### Como Rodar

**Requisitos:** Node.js 22.11 ou mais novo, pnpm 12 (`corepack enable` escolhe a versão certa) e um banco PostgreSQL.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # depois ajuste o DATABASE_URL
pnpm --filter @apc/api exec prisma migrate deploy   # cria as tabelas do banco
pnpm --filter @apc/api db:seed            # adiciona os usuários de teste, as listas padrão e itens de exemplo
pnpm dev                                  # API na porta 3333, web na 5173
```

Os usuários ficam no banco: o seed cadastra os usuários de teste de `packages/shared/src/auth/testUsers.ts`, como `christian.camilo` / `opala4100` (valores só de teste), e qualquer pessoa pode criar uma conta em "Criar conta" no login, informando nome, usuário, e-mail (só guardado por enquanto) e senha. As senhas são guardadas em hash. Sessões de verdade, com tokens, vêm com o backend real (EP-10).

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
| `pnpm --filter @apc/web test:e2e:ui` | Abre a interface do Playwright para rodar e depurar os testes |
| `pnpm --filter @apc/web storybook` | Abre o Storybook na porta 6006, com as bases, os componentes e os mockups de tela do design system |
| `pnpm --filter @apc/mobile start` | Inicia o bundler do React Native |
| `pnpm --filter @apc/mobile android` | Roda o app no Android |
| `pnpm --filter @apc/api start:home` | Aplica as migrações e liga a API, como o servidor de casa faz |

### Rodando em Casa

A API e o banco podem rodar num computador Windows em casa, para o app do celular na mesma rede Wi-Fi e o app desktop nesse computador. O servidor pode ser ligado na mão pelo atalho **Ligar servidor APC** na área de trabalho, ou por uma tarefa do Agendador de Tarefas que o liga em segundo plano. O [guia do servidor em casa](docs/home-server.md#-português-brasil) tem todos os passos: instalação, como ligar, firewall, como conferir pelo celular, backup e atualização. Ele é só para a rede de casa.

### Roadmap

O trabalho é organizado em épicos, acompanhados como [issues no GitHub](https://github.com/ChrisCamilo/apc-universal-repair/issues?q=label%3Aepic).

- **MVP ✅:** Setup → Design System → Auth (login e cadastro) → Dashboard → Estoque (com fotos, importação e exportação por CSV)
- **Otimizações ✅:** receitas e ids de estilo em todos os componentes, garantidos pelo lint
- **Fase 2 (em andamento):** aba Catálogo ✅ (com dados de exemplo, aparecendo em construção) e Ficha técnica
- **Próximos passos:** a API num computador de casa para o app do celular ✅, compressão das fotos, app desktop para Windows e build de release para Android
- **Depois:** visualizador 3D, ficha de manutenção, diagnósticos, valores de referência, backend real e interface completa em inglês e português

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

Depois disso, a API em casa também ficou pronta. Ainda em aberto: 4 tasks (20 pontos) — compressão das fotos, o app desktop para Windows, o build de release para Android e os valores de estilo que faltam decidir — além do épico de Ficha técnica.

### Como Contribuir

Mensagens de commit, nomes de branch, épicos e convenções das tasks estão no [AGENTS.md](AGENTS.md). Toda task tem estimativa, prioridade, tamanho, responsável, o épico e as tasks que a bloqueiam.

### Objetivo

Ajudar mecânicos, entusiastas e proprietários de veículos a preservar as boas práticas de manutenção, tornando os dados técnicos originais acessíveis e visuais.

### Status

🚧 Em desenvolvimento: o MVP está pronto na web e no celular — login e cadastro, o Dashboard e o Estoque — e a fase 2 está em andamento, com a aba Catálogo feita sobre dados de exemplo e a Ficha técnica em seguida.
