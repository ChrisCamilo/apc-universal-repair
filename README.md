# APC Universal Repair

🇺🇸 [English (US)](#-english-us) | 🇧🇷 [Português (Brasil)](#-português-brasil)

---

## 🇺🇸 English (US)

### About the Project

**APC Universal Repair** is a vehicle catalog organized by brand, where you can view each vehicle's 3D model and learn how every part was originally assembled. The goal is to promote good maintenance practices by giving access to the vehicle's technical specifications — bolt and screw measurements, torque values, original part codes, possible diagnostics, and reference prices whenever available.

It also includes a **parts inventory**, so a workshop can keep track of the parts it has in stock and find, from a part's code, which vehicles it fits.

### Features

**MVP (in progress)**

- 📚 Vehicle catalog organized by brand, model, generation, version, year and engine
- 🔎 Catalog search by brand, model or the code of a part in stock
- 📦 Parts inventory: add, view, edit and delete parts, each with its part code, category, part brand, vehicle brand and model, position, side, color, location, quantity, minimum stock and unit price (R$)
- 🧭 Inventory search by name or part code, filters, sorting on every column and pagination (25, 50 or 100 per page)
- 🚦 Low-stock and out-of-stock rows highlighted in color
- 🎓 Guided tutorial the first time the Inventory tab is opened, available again from the user menu
- 🎨 Three visual styles — **Anos 80**, **GT4** and **BMW 90** — each with light and dark modes

**Next phases**

- 🖼️ Up to 3 photos per part, with a large viewer
- 📄 Batch import of parts from CSV
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
| `apps/web` | Web app — React 19, Vite, Vitest and Playwright (tests in TypeScript) |
| `apps/mobile` | Mobile app — React Native 0.87 |
| `apps/api` | API — Fastify, Zod, Prisma on PostgreSQL |
| `packages/shared` | Zod schemas and types shared by web, mobile and API |

Web tests are written in TypeScript: component tests with **Vitest Browser Mode**, which runs them in Chromium, and end-to-end tests with **Playwright**, at 1280×720 and 360×780. Vitest comes with the first Design System components. See [AGENTS.md](AGENTS.md#testing) for details.

CI (GitHub Actions) runs lint, build and the Playwright E2E tests on every pull request.

### Getting Started

**Requirements:** Node.js 22.11 or newer, pnpm 12 (`corepack enable` picks the right version) and a PostgreSQL database.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL
pnpm dev                                  # API on :3333, web on :5173
```

Before the first E2E run, download the browser Playwright uses:

```bash
pnpm --filter @apc/web exec playwright install chromium
```

| Command | What it does |
|---|---|
| `pnpm dev` | Runs every app in development mode |
| `pnpm build` | Builds every package |
| `pnpm lint` | Lints every package |
| `pnpm test:e2e` | Runs the web E2E tests at 1280×720 and 360×780 (starts the API and the web app) |
| `pnpm --filter @apc/web test:e2e:ui` | Opens the Playwright UI to run and debug the tests |
| `pnpm --filter @apc/mobile start` | Starts the React Native bundler |
| `pnpm --filter @apc/mobile android` | Runs the mobile app on Android |

### Roadmap

Work is organized in epics, tracked as [GitHub issues](https://github.com/ChrisCamilo/apc-universal-repair/issues?q=label%3Aepic).

- **MVP:** Setup ✅ → Design System → Auth (login) → Dashboard → Inventory → Car Specs
- **Later:** 3D viewer, maintenance specs, diagnostics, reference prices, real backend and full EN/PT-BR app UI

### MVP Estimate

Estimate as of October 2026: about **370 hours** of work to finish the MVP (between 250 and 490 hours).

| | Story points | Hours |
|---|---|---|
| Planned tasks: Design System, Dashboard and Inventory (41 tasks) | 201 | ~300 |
| Not yet split into tasks: Auth (login), Catalog tab and Car Specs | ~45 | ~70 |
| **MVP total** | **~246** | **~370** |
| Inventory phase 2: photos and CSV import (after the MVP) | 31 | ~45 |

| Pace | Calendar time |
|---|---|
| Full time, ~30 productive hours a week | ~3 months (2 to 4) |
| Part time, ~10 hours a week | ~9 months (6 to 11) |

1 story point ≈ 1.5 hours (1 to 2), since every UI task ships on web and mobile in three styles and two modes, with tests. There is no delivery history yet to measure the real pace, so the estimate will be revised as the first tasks close.

### Contributing

Commit messages, branch names, epics and task conventions are defined in [AGENTS.md](AGENTS.md). Every task has an estimate, priority, size, assignee, its epic and the tasks that block it.

### Goal

Help mechanics, enthusiasts, and vehicle owners preserve correct maintenance practices by making original technical data easily accessible and visual.

### Status

🚧 In development: the monorepo is set up (web, mobile and API) and the MVP epics are underway.

---

## 🇧🇷 Português (Brasil)

### Sobre o Projeto

O **APC Universal Repair** é um catálogo de veículos separados por marca, onde você pode visualizar o modelo 3D de cada veículo e saber como cada parte foi originalmente colocada. A ideia é preservar as boas práticas de manutenção, oferecendo acesso à ficha técnica do veículo — medidas de parafusos, torque, código original da peça, possíveis diagnósticos e valores de referência, quando possível.

Ele também inclui um **estoque de peças**, para a oficina controlar as peças que tem e descobrir, pelo código de uma peça, em quais veículos ela serve.

### Funcionalidades

**MVP (em andamento)**

- 📚 Catálogo de veículos organizado por marca, modelo, geração, versão, ano e motor
- 🔎 Busca no catálogo por marca, modelo ou código de uma peça do estoque
- 📦 Estoque de peças: adicionar, ver, editar e excluir peças, cada uma com código da peça, categoria, marca da peça, marca e modelo do veículo, posição, lado, cor, local, quantidade, estoque mínimo e valor unitário (R$)
- 🧭 Busca no estoque por nome ou código da peça, filtros, ordenação em todas as colunas e paginação (25, 50 ou 100 por página)
- 🚦 Linhas com estoque baixo e esgotado destacadas por cor
- 🎓 Tutorial guiado na primeira vez que a aba Estoque é aberta, disponível de novo no menu do usuário
- 🎨 Três estilos visuais — **Anos 80**, **GT4** e **BMW 90** — cada um com modo claro e escuro

**Próximas fases**

- 🖼️ Até 3 fotos por peça, com visualizador em tamanho grande
- 📄 Importação de peças em lote por CSV
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
| `apps/web` | App web — React 19, Vite, Vitest e Playwright (testes em TypeScript) |
| `apps/mobile` | App para celular — React Native 0.87 |
| `apps/api` | API — Fastify, Zod, Prisma com PostgreSQL |
| `packages/shared` | Schemas Zod e tipos compartilhados entre web, celular e API |

Os testes da web são escritos em TypeScript: testes de componente com o **Vitest Browser Mode**, que os roda no Chromium, e testes de ponta a ponta com o **Playwright**, em 1280×720 e 360×780. O Vitest entra junto com os primeiros componentes do Design System. Os detalhes estão no [AGENTS.md](AGENTS.md#testing).

O CI (GitHub Actions) roda lint, build e os testes E2E do Playwright em todo pull request.

### Como Rodar

**Requisitos:** Node.js 22.11 ou mais novo, pnpm 12 (`corepack enable` escolhe a versão certa) e um banco PostgreSQL.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # depois ajuste o DATABASE_URL
pnpm dev                                  # API na porta 3333, web na 5173
```

Antes de rodar os testes E2E pela primeira vez, baixe o navegador que o Playwright usa:

```bash
pnpm --filter @apc/web exec playwright install chromium
```

| Comando | O que faz |
|---|---|
| `pnpm dev` | Roda todos os apps em modo de desenvolvimento |
| `pnpm build` | Gera o build de todos os pacotes |
| `pnpm lint` | Roda o lint em todos os pacotes |
| `pnpm test:e2e` | Roda os testes E2E da web em 1280×720 e 360×780 (sobe a API e o app web) |
| `pnpm --filter @apc/web test:e2e:ui` | Abre a interface do Playwright para rodar e depurar os testes |
| `pnpm --filter @apc/mobile start` | Inicia o bundler do React Native |
| `pnpm --filter @apc/mobile android` | Roda o app no Android |

### Roadmap

O trabalho é organizado em épicos, acompanhados como [issues no GitHub](https://github.com/ChrisCamilo/apc-universal-repair/issues?q=label%3Aepic).

- **MVP:** Setup ✅ → Design System → Auth (login) → Dashboard → Estoque → Ficha técnica
- **Depois:** visualizador 3D, ficha de manutenção, diagnósticos, valores de referência, backend real e interface completa em inglês e português

### Estimativa do MVP

Estimativa de outubro de 2026: cerca de **370 horas** de trabalho para terminar o MVP (entre 250 e 490 horas).

| | Story points | Horas |
|---|---|---|
| Tasks planejadas: Design System, Dashboard e Estoque (41 tasks) | 201 | ~300 |
| Ainda sem tasks: Auth (login), aba Catálogo e Ficha técnica | ~45 | ~70 |
| **Total do MVP** | **~246** | **~370** |
| Fase 2 do Estoque: fotos e importação por CSV (depois do MVP) | 31 | ~45 |

| Ritmo | Prazo |
|---|---|
| Tempo integral, ~30 horas produtivas por semana | ~3 meses (2 a 4) |
| Meio período, ~10 horas por semana | ~9 meses (6 a 11) |

1 story point ≈ 1,5 hora (de 1 a 2), já que toda task de interface sai na web e no celular, em três estilos e dois modos, com testes. Ainda não há histórico de entregas para medir o ritmo real, então a estimativa será revisada conforme as primeiras tasks forem fechadas.

### Como Contribuir

Mensagens de commit, nomes de branch, épicos e convenções das tasks estão no [AGENTS.md](AGENTS.md). Toda task tem estimativa, prioridade, tamanho, responsável, o épico e as tasks que a bloqueiam.

### Objetivo

Ajudar mecânicos, entusiastas e proprietários de veículos a preservar as boas práticas de manutenção, tornando os dados técnicos originais acessíveis e visuais.

### Status

🚧 Em desenvolvimento: o monorepo está montado (web, celular e API) e os épicos do MVP estão em andamento.
