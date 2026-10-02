# @apc/web

🇺🇸 [English (US)](#-english-us) | 🇧🇷 [Português (Brasil)](#-português-brasil)

---

## 🇺🇸 English (US)

Web app of APC Universal Repair: React 19, Vite and Tailwind 4, styled only through the theme tokens in `@apc/shared/theme`.

### Scripts

Run them from the repository root with `pnpm --filter @apc/web <script>`, or from this folder with `pnpm <script>`.

| Script | What it does |
|---|---|
| `dev` | Starts the app on http://localhost:5173 (calls to `/api` go to the API on :3333) |
| `build` | Type-checks and builds the app into `dist/` |
| `lint` | Lints with oxlint |
| `test` | Runs the component tests with Vitest Browser Mode in Chromium |
| `test:e2e` | Runs the Playwright E2E tests at 1280×720 and 360×780, starting the API and the app |
| `test:e2e:ui` | Opens the Playwright UI to run and debug the E2E tests |
| `storybook` | Opens Storybook on http://localhost:6006 |
| `build-storybook` | Builds a static Storybook into `storybook-static/` |

The tests need Chromium once: `pnpm exec playwright install chromium`.

### Storybook

- The toolbar has a **style** switcher (`eighties`, `gt4`) and a **mode** switcher (`night`, `day`), so every story can be seen in all four combinations.
- The **viewport** menu has the supported sizes: Desktop 1280×720, Mobile design 390×844 and Mobile minimum 360×780.
- **Foundations** shows the tokens as the active style and mode resolve them: palette, type scale, spacing, radii and motion.
- Stories live next to the code as `*.stories.tsx` and use the same Tailwind setup as the app.

---

## 🇧🇷 Português (Brasil)

App web do APC Universal Repair: React 19, Vite e Tailwind 4, com estilo vindo só dos tokens de tema em `@apc/shared/theme`.

### Scripts

Rode a partir da raiz do repositório com `pnpm --filter @apc/web <script>`, ou desta pasta com `pnpm <script>`.

| Script | O que faz |
|---|---|
| `dev` | Sobe o app em http://localhost:5173 (as chamadas para `/api` vão para a API na porta 3333) |
| `build` | Confere os tipos e gera o build do app em `dist/` |
| `lint` | Roda o lint com o oxlint |
| `test` | Roda os testes de componente com o Vitest Browser Mode no Chromium |
| `test:e2e` | Roda os testes E2E do Playwright em 1280×720 e 360×780, subindo a API e o app |
| `test:e2e:ui` | Abre a interface do Playwright para rodar e depurar os testes E2E |
| `storybook` | Abre o Storybook em http://localhost:6006 |
| `build-storybook` | Gera um Storybook estático em `storybook-static/` |

Os testes precisam do Chromium uma vez: `pnpm exec playwright install chromium`.

### Storybook

- A barra de ferramentas tem um seletor de **estilo** (`eighties`, `gt4`) e um de **modo** (`night`, `day`), para ver qualquer story nas quatro combinações.
- O menu de **viewport** tem os tamanhos suportados: Desktop 1280×720, Mobile design 390×844 e Mobile mínimo 360×780.
- **Foundations** mostra os tokens como o estilo e o modo ativos os resolvem: paleta, escala tipográfica, espaçamento, raios e movimento.
- As stories ficam junto do código como `*.stories.tsx` e usam o mesmo Tailwind do app.
