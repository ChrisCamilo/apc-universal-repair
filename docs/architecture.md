# Architecture · Arquitetura

[🇺🇸 English](#-english-us) · [🇧🇷 Português](#-português-brasil)

APC Universal Repair is a **pnpm + Turborepo** monorepo: a web app and a mobile app built on one shared package, talking to one API over HTTP. The database is described in [database.md](database.md).

O APC Universal Repair é um monorepo **pnpm + Turborepo**: um app web e um app para celular feitos sobre um pacote compartilhado, conversando com uma API por HTTP. O banco está descrito em [database.md](database.md).

## Overview · Visão geral

```mermaid
flowchart LR
    subgraph clients["Clients · Clientes"]
        web["<b>apps/web</b><br/>React 19 · Vite 8<br/>Tailwind CSS 4 · React Router 8"]
        mobile["<b>apps/mobile</b><br/>React Native 0.87<br/>AsyncStorage · SVG"]
        desktop["<b>apps/desktop</b><br/>Electron 44<br/>web build · app://apc"]
    end

    shared["<b>packages/shared</b> · @apc/shared<br/>Zod 4 schemas · rules · design tokens<br/>TypeScript, no UI"]

    subgraph server["Server · Servidor"]
        api["<b>apps/api</b><br/>Fastify 5 · Zod type provider<br/>Prisma 7 · sharp"]
        db[("PostgreSQL<br/>schema.prisma")]
        files[("uploads/photos<br/>PHOTOS_DIR")]
    end

    web -- imports --> shared
    desktop -- "packages the web build" --> web
    mobile -- imports --> shared
    api -- imports --> shared
    web -- "HTTP JSON · /api proxy" --> api
    mobile -- "HTTP JSON · API_URL" --> api
    desktop -- "app://apc/api forwarded · APC_API_URL" --> api
    api -- "Prisma Client · adapter-pg" --> db
    api -- "photos + WebP thumbnails" --> files
```

## Shared package · Pacote compartilhado

Everything web, mobile and API must agree on lives in `@apc/shared`, imported by subpath (e.g. `@apc/shared/items`).

Tudo em que web, celular e API precisam concordar fica no `@apc/shared`, importado por subcaminho (ex.: `@apc/shared/items`).

```mermaid
flowchart TB
    subgraph inventory["Inventory · Estoque"]
        items["items<br/>item schemas · writing rule · search · sort"]
        itemForm["item-form<br/>form checks · price in reais"]
        itemFilters["item-filters<br/>filters · list query"]
        itemCsv["item-csv<br/>CSV template · reading · import · export"]
        lists["lists<br/>categories · brands · models"]
        photos["photos<br/>photo rules · upload parts"]
        tutorial["inventory-tutorial<br/>tutorial steps · test item"]
    end
    subgraph ui["Design system"]
        theme["theme<br/>4 styles × 2 modes · tokens"]
        rest["typography · button · field · dialog<br/>tabs · table · pagination · filters<br/>icons · tree · tour"]
        styling["style-ids · screens<br/>style ids · style guard · screen sizes"]
    end
    subgraph other["App"]
        auth["auth · test-users<br/>sign-up rules · login on the API · mock"]
        catalog["catalog<br/>mocked vehicle catalog"]
    end
    itemForm --> items
    itemFilters --> items
    itemCsv --> items
    itemForm --> lists
    itemFilters --> lists
    itemCsv --> lists
    lists --> catalog
    catalog --> items
    tutorial --> itemForm
    tutorial --> itemFilters
    tutorial --> rest
```

## Saving an item · Salvando um item

```mermaid
sequenceDiagram
    actor User as User · Usuário
    participant App as apps/web or apps/mobile
    participant Shared as @apc/shared
    participant API as apps/api
    participant DB as PostgreSQL

    User->>App: fills the item form · preenche o formulário
    App->>Shared: itemFormErrors() · itemFormBody()
    App->>API: POST /items (JSON)
    API->>Shared: itemCreateSchema (Zod)
    API->>DB: listIds() — find or add list entries
    API->>DB: create Item with references
    DB-->>API: row + entry names
    API-->>App: itemSchema JSON (names, "D", "LE"…)
    App->>API: PUT /items/:id/photos (multipart)
    API-->>App: item with photos
    App-->>User: toast · list reloads
```

## At home · Em casa

On a Windows computer at home, `pnpm run start:home` applies the migrations and starts the API with `tsx`, on `0.0.0.0` so the phone reaches it over the Wi-Fi at `http://<ip>:3333`, while the desktop app on that computer uses `localhost:3333` and starts the API itself when it doesn't answer. `apps/api/scripts/start-server.ps1` runs it in a window for the "Ligar servidor APC" shortcut, or with no window for a Task Scheduler task, logging to `apps/api/logs/` and starting it again when it stops. PostgreSQL runs as its own Windows service. The steps are in [home-server.md](home-server.md).

Num computador Windows em casa, o `pnpm run start:home` aplica as migrações e liga a API com o `tsx`, em `0.0.0.0`, para o celular chegar a ela pelo Wi-Fi em `http://<ip>:3333`, enquanto o app desktop nesse computador usa `localhost:3333` e liga a API sozinho quando ela não responde. O `apps/api/scripts/start-server.ps1` a roda numa janela, para o atalho "Ligar servidor APC", ou sem janela, para uma tarefa do Agendador de Tarefas, com o log em `apps/api/logs/` e religando a API quando ela para. O PostgreSQL roda como um serviço do Windows próprio. Os passos estão em [home-server.md](home-server.md#-português-brasil).

## Desktop app · App desktop

```mermaid
sequenceDiagram
    participant Page as Window · Janela<br/>(web build)
    participant Main as apps/desktop<br/>main process
    participant API as apps/api
    participant Start as start-server.ps1

    Main->>API: GET /health (local API only · só API local)
    alt no answer · sem resposta
        Main->>Start: Start-Process … -Background
        Note over Main: shows starting.html · mostra "Ligando o servidor"
        Start->>API: pnpm run start:home
        Main->>API: GET /health until it answers · até responder
    end
    Main->>Page: loadURL app://apc/
    Page->>Main: app://apc/assets/… · /inventory
    Main-->>Page: apps/web/dist file, or index.html · arquivo do build, ou index.html (CSP)
    Page->>Main: app://apc/api/items
    Main->>API: GET /items (net.fetch, same method, headers, body)
    API-->>Main: JSON
    Main-->>Page: JSON, or 502 when unreachable · ou 502 sem conexão
```

The desktop app loads the web build from its own `app://apc` protocol, so routes, assets and `localStorage` work as in the browser and keep one origin across restarts. `/api/*` is forwarded to the API address (`APC_API_URL`, `config.json` in userData, or `http://localhost:3333`), so the web code is unchanged and the API needs no CORS. When that address is this computer and the API doesn't answer, the app starts it in the background through `start-server.ps1`, and leaves it running after it closes. The window has no Node access, no permissions and can't navigate away; external links open in the system browser.

O app desktop carrega o build da web pelo próprio protocolo `app://apc`, então rotas, arquivos e o `localStorage` funcionam como no navegador e mantêm uma só origem entre reinícios. O `/api/*` é encaminhado para o endereço da API (`APC_API_URL`, `config.json` no userData, ou `http://localhost:3333`), então o código da web não muda e a API não precisa de CORS. Quando esse endereço é este computador e a API não responde, o app a liga em segundo plano pelo `start-server.ps1` e a deixa rodando depois de fechar. A janela não tem acesso ao Node nem permissões e não navega para fora; links externos abrem no navegador do sistema.

## Styles · Estilos

Each component keeps its look in a recipe in its own `<Component>.styles.ts`, built from the theme tokens, which gives the classes or styles and the style id of each element. Lint fails when a component writes a style or an id by hand.

Cada componente guarda a aparência numa receita no seu próprio `<Componente>.styles.ts`, feita dos tokens do tema, que dá as classes ou estilos e o id de estilo de cada elemento. O lint falha quando um componente escreve um estilo ou um id à mão.

```mermaid
flowchart LR
    tokens["@apc/shared/theme<br/>tokens"]
    ids["@apc/shared/style-ids<br/>scopes · styleIds()"]
    guard["styleGuard · checkStyles<br/>lint:styles"]
    subgraph web["apps/web"]
        tv["styles/tv.ts<br/>tv() · recipe()"]
        webStyles["Component.styles.ts"]
        webComponent["Component.tsx<br/>className · data-testid"]
    end
    subgraph mobile["apps/mobile"]
        create["styles/createStyles.ts<br/>createStyles()"]
        mobileStyles["Component.styles.ts"]
        mobileComponent["Component.tsx<br/>style · testID"]
    end
    tokens --> tv
    tokens --> create
    ids --> tv
    ids --> create
    tv --> webStyles --> webComponent
    create --> mobileStyles --> mobileComponent
    guard -. checks · verifica .-> webComponent
    guard -. checks · verifica .-> mobileComponent
```

| Scope · Escopo | Covers · Cobre |
|---|---|
| `common` | The design system · O design system |
| `auth` | The login · O login |
| `dashboard` | The shell around the tabs · A moldura em volta das abas |
| `catalog` | The Catalog tab · A aba Catálogo |
| `inventory` | The Inventory tab and its dialogs · A aba Estoque e seus diálogos |
| `docs` | Storybook-only pages · Páginas só do Storybook |

An id reads `<scope>.<component>[.<slot>…]`, e.g. `common.dialog.header.close`, the same on web and mobile. See "Styles" in [AGENTS.md](../AGENTS.md).

Um id é `<escopo>.<componente>[.<slot>…]`, ex.: `common.dialog.header.close`, igual na web e no celular. Veja "Styles" no [AGENTS.md](../AGENTS.md).

---

## 🇺🇸 English (US)

### Parts

| Part | What it does | Main technologies |
|---|---|---|
| `packages/shared` | The contract and the rules: Zod schemas of every request and response, the writing rule, search and sort, form checks, CSV reading and writing, design tokens of the 4 styles and 2 modes. No UI, so web and mobile behave the same. | TypeScript, Zod 4 |
| `apps/web` | The web app: login and sign-up, Dashboard with the Inventory and Catalog tabs, design system components. | React 19, Vite 8, Tailwind CSS 4, React Router 8, Storybook 10 |
| `apps/mobile` | The phone app, the same screens with React Native components. | React Native 0.87, AsyncStorage, react-native-svg, image and document pickers |
| `apps/desktop` | The Windows desktop app: the web build in an Electron window, the API forwarded through `app://apc`, and the local API started when it doesn't answer. | Electron 44, electron-builder (NSIS and portable) |
| `apps/api` | The REST API: users (sign-up and login), items, item lists, photos, CSV import. Validates every request with the shared schemas. | Fastify 5, Prisma 7 (PostgreSQL, adapter-pg), sharp, @fastify/multipart |
| PostgreSQL | Users, items, lists and photo records. Photo files stay on disk under `PHOTOS_DIR`. | PostgreSQL, Prisma migrations |

### How they talk

- Web and mobile call the API over HTTP with JSON; the web goes through the Vite dev server's `/api` proxy, the phone straight to `API_URL`.
- At home, the API runs on a Windows computer and the phone reaches it over the Wi-Fi (see [home-server.md](home-server.md)).
- Both sides use the same Zod schemas from `@apc/shared`, so a field can't mean one thing in the app and another in the API.
- The API speaks names (`"Motor"`, `"D"`); the database keeps references and enums (see [database.md](database.md)).
- Sign-up (`POST /users`) and login (`POST /sessions`) go to the API, which keeps the users and checks the password against its hash; the app saves the user it answers with as the session on the device. Real sessions, with tokens the API checks, come with EP-10.

### Tooling

| Concern | Tool |
|---|---|
| Monorepo, tasks and cache | pnpm 12 workspaces, Turborepo 2 |
| Language | TypeScript 5–6 |
| Lint | ESLint with typescript-eslint (shared, API, mobile), oxlint (web), and the style guard (`lint:styles`) on web and mobile |
| Shared and API tests | Node test runner (`node --test`, `tsx --test`) |
| Web component tests | Vitest 5 Browser Mode in Chromium |
| Web end-to-end tests | Playwright, at 1280×720 and 360×780 |
| Mobile tests | Jest with react-test-renderer |
| Design system catalog | Storybook 10 |
| Desktop app tests | Node test runner, and Playwright's Electron support for the smoke test |
| Style recipes | tailwind-variants with tailwind-merge (web), `createStyles` over `StyleSheet` (mobile), both giving style ids |
| CI | GitHub Actions: lint, typecheck, build, tests and E2E on every pull request |

---

## 🇧🇷 Português (Brasil)

### Partes

| Parte | O que faz | Principais tecnologias |
|---|---|---|
| `packages/shared` | O contrato e as regras: schemas Zod de cada requisição e resposta, a regra de escrita, busca e ordenação, as validações do formulário, a leitura e a escrita do CSV e os tokens de design dos 4 estilos e 2 modos. Sem interface, para web e celular funcionarem igual. | TypeScript, Zod 4 |
| `apps/web` | O app web: login e cadastro, Dashboard com as abas Estoque e Catálogo, componentes do design system. | React 19, Vite 8, Tailwind CSS 4, React Router 8, Storybook 10 |
| `apps/mobile` | O app para celular, com as mesmas telas em componentes React Native. | React Native 0.87, AsyncStorage, react-native-svg, seletores de imagem e de documentos |
| `apps/desktop` | O app desktop para Windows: o build da web numa janela do Electron, a API encaminhada pelo `app://apc` e a API local ligada quando não responde. | Electron 44, electron-builder (NSIS e portátil) |
| `apps/api` | A API REST: usuários (cadastro e login), itens, listas, fotos e importação de CSV. Valida cada requisição com os schemas compartilhados. | Fastify 5, Prisma 7 (PostgreSQL, adapter-pg), sharp, @fastify/multipart |
| PostgreSQL | Usuários, itens, listas e os registros das fotos. Os arquivos das fotos ficam em disco, em `PHOTOS_DIR`. | PostgreSQL, migrações do Prisma |

### Como conversam

- Web e celular chamam a API por HTTP com JSON; a web passa pelo proxy `/api` do servidor do Vite, o celular vai direto ao `API_URL`.
- Em casa, a API roda num computador Windows e o celular chega a ela pelo Wi-Fi (veja [home-server.md](home-server.md#-português-brasil)).
- Os dois lados usam os mesmos schemas Zod do `@apc/shared`, então um campo não pode significar uma coisa no app e outra na API.
- A API fala em nomes (`"Motor"`, `"D"`); o banco guarda referências e enums (veja [database.md](database.md)).
- O cadastro (`POST /users`) e o login (`POST /sessions`) vão para a API, que guarda os usuários e confere a senha com o hash dela; o app salva o usuário que ela responde como a sessão no aparelho. Sessões de verdade, com tokens conferidos pela API, vêm com o EP-10.

### Ferramentas

| Assunto | Ferramenta |
|---|---|
| Monorepo, tarefas e cache | workspaces do pnpm 12, Turborepo 2 |
| Linguagem | TypeScript 5–6 |
| Lint | ESLint com typescript-eslint (shared, API, celular), oxlint (web), e a verificação de estilos (`lint:styles`) na web e no celular |
| Testes do shared e da API | Test runner do Node (`node --test`, `tsx --test`) |
| Testes de componente da web | Vitest 5 Browser Mode no Chromium |
| Testes de ponta a ponta da web | Playwright, em 1280×720 e 360×780 |
| Testes do celular | Jest com react-test-renderer |
| Catálogo do design system | Storybook 10 |
| Testes do app desktop | Test runner do Node, e o suporte a Electron do Playwright no smoke test |
| Receitas de estilo | tailwind-variants com tailwind-merge (web), `createStyles` sobre o `StyleSheet` (celular), as duas dando os ids de estilo |
| CI | GitHub Actions: lint, typecheck, build, testes e E2E em todo pull request |
