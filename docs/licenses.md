# Licenses · Licenças

[🇺🇸 English](#-english-us) · [🇧🇷 Português](#-português-brasil)

Written by `node scripts/licenses.mjs write`; don't edit by hand · Escrito pelo `node scripts/licenses.mjs write`; não edite à mão.

---

## 🇺🇸 English (US)

APC Universal Repair is all rights reserved ([LICENSE](../LICENSE), `UNLICENSED` in every `package.json`). This is the audit of every package it installs, so a sold, closed product meets their licenses. `node scripts/licenses.mjs check` keeps it true in CI.

- **Permissive** (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, Unlicense, CC0, WTFPL, Python-2.0, CC-BY-4.0, and OFL-1.1 for the fonts): fine in a closed, sold product. They ask to keep their notice, which [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) does, shipped with the installer and the APK. OFL fonts can't be sold on their own, only inside the product.
- **Weak copyleft** (LGPL, MPL, EPL): only as reviewed below, unchanged and as separate libraries, or in tools that don't ship.
- **Strong copyleft** (GPL, AGPL, SSPL): none is installed. One in what ships would ask to open the project's code, so CI refuses any new one.
- **Shipped:** 393 npm packages, the 179 Android libraries of the phone app's release, and Electron with Chromium, which ship their own notices.

### Every installed package, by license

1396 packages, development ones included:

| License | Packages |
|---|---|
| MIT | 1148 |
| ISC | 80 |
| Apache-2.0 | 61 |
| BSD-3-Clause | 38 |
| BSD-2-Clause | 27 |
| BlueOak-1.0.0 | 11 |
| OFL-1.1 | 6 |
| (MIT OR CC0-1.0) | 4 |
| MPL-2.0 | 4 |
| 0BSD | 3 |
| Unlicense | 2 |
| (BSD-2-Clause OR MIT OR Apache-2.0) | 1 |
| (MIT OR Apache-2.0) | 1 |
| (MIT OR WTFPL) | 1 |
| (WTFPL OR MIT) | 1 |
| Apache-2.0 AND LGPL-3.0-or-later | 1 |
| CC-BY-4.0 | 1 |
| CC0-1.0 | 1 |
| EPL-2.0 | 1 |
| MIT and ISC | 1 |
| Python-2.0 | 1 |
| WTFPL | 1 |
| WTFPL OR ISC | 1 |

### Outside the permissive licenses

| Package | License | Ships | Why it's fine |
|---|---|---|---|
| @img/sharp-win32-x64 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | yes | sharp's prebuilt binary, with libvips under the LGPL as its own DLLs (libvips-42.dll). They ship unchanged, as separate libraries the user can replace, with their notice and their source at https://github.com/libvips/libvips, which the LGPL allows in a closed product. |
| elkjs 0.11.1 | EPL-2.0 | no | The graph layout of Prisma Studio, in the Prisma CLI, a development tool: it doesn't ship. |
| lightningcss 1.32.0 | MPL-2.0 | no | Tailwind's CSS compiler, used only while building: the CSS it writes is the project's own, and the compiler doesn't ship. |
| lightningcss 1.33.0 | MPL-2.0 | no | Tailwind's CSS compiler, used only while building: the CSS it writes is the project's own, and the compiler doesn't ship. |
| lightningcss-win32-x64-msvc 1.32.0 | MPL-2.0 | no | Tailwind's CSS compiler, used only while building: the CSS it writes is the project's own, and the compiler doesn't ship. |
| lightningcss-win32-x64-msvc 1.33.0 | MPL-2.0 | no | Tailwind's CSS compiler, used only while building: the CSS it writes is the project's own, and the compiler doesn't ship. |

### Android libraries

Every library in the phone app's release, 179 of them, from its Gradle tree: `gradlew :app:writeLicenses` writes them, with the licenses their POMs name, to `apps/mobile/android/licenses.json`, and the Android workflow fails when the file is out of date. THIRD_PARTY_NOTICES.md lists each one.

| License | Libraries |
|---|---|
| Apache-2.0 | 143 |
| MIT | 24 |
| ML Kit Terms of Service | 6 |
| Android Software Development Kit License | 4 |
| Apache-2.0 AND BSD-3-Clause | 1 |
| BSD-3-Clause | 1 |

### Vehicle data

The vehicle brands and models a server starts with (`STARTING_VEHICLE_BRANDS` in `@apc/domain/vehicle-lists`) are names only: facts, which no license covers. They were gathered from reliable, free sources whose terms allow this use, and only to confirm that each model exists and was sold in Brazil. Nothing was paid for, licensed or taken from members-only data, no site was scraped against its terms, and no text, photo, description or price was copied.

- **Wikipedia in Portuguese:** each model's article, or its brand's article, read through the Wikimedia API one request at a time, as its etiquette asks, to confirm the model was sold in Brazil. The [Wikimedia Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use) let facts be reused freely, without attribution; the articles' text (CC BY-SA 4.0) wasn't copied.
- **FENABRAVE's public report of December 2025:** the names of the 21 brands most sold in Brazil in 2025, to choose the brands. No figure was kept.
- **Left out:** a model no such source confirmed. Not used: FIPE (all rights reserved, and its full table is sold), the APIs and copies of its table that others publish, TecDoc, Car2DB, Teoalida and FENABRAVE's members-only data.

### Contributions

Outside contributions are only taken with a signed assignment of their rights (CLA), so the code keeps one author and can be relicensed or sold.

This isn't legal advice: before selling the product, have a lawyer review the license and this audit.

---

## 🇧🇷 Português (Brasil)

O APC Universal Repair tem todos os direitos reservados ([LICENSE](../LICENSE), `UNLICENSED` em todo `package.json`). Esta é a auditoria de todos os pacotes que ele instala, para que um produto fechado e vendido cumpra as licenças deles. O `node scripts/licenses.mjs check` a mantém verdadeira no CI.

- **Permissivas** (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, Unlicense, CC0, WTFPL, Python-2.0, CC-BY-4.0, e a OFL-1.1 das fontes): servem num produto fechado e vendido. Elas pedem que o aviso delas seja mantido, o que o [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) faz, levado com o instalador e o APK. As fontes OFL não podem ser vendidas sozinhas, só dentro do produto.
- **Copyleft fraco** (LGPL, MPL, EPL): só como revisado abaixo, sem mudanças e como bibliotecas separadas, ou em ferramentas que não vão junto.
- **Copyleft forte** (GPL, AGPL, SSPL): nenhuma está instalada. Uma no que vai junto pediria para abrir o código do projeto, então o CI recusa qualquer nova.
- **O que vai junto:** 393 pacotes npm, as 179 bibliotecas Android do release do app do celular, e o Electron com o Chromium, que levam os próprios avisos.

### Todos os pacotes instalados, por licença

1396 pacotes, os de desenvolvimento inclusive:

| Licença | Pacotes |
|---|---|
| MIT | 1148 |
| ISC | 80 |
| Apache-2.0 | 61 |
| BSD-3-Clause | 38 |
| BSD-2-Clause | 27 |
| BlueOak-1.0.0 | 11 |
| OFL-1.1 | 6 |
| (MIT OR CC0-1.0) | 4 |
| MPL-2.0 | 4 |
| 0BSD | 3 |
| Unlicense | 2 |
| (BSD-2-Clause OR MIT OR Apache-2.0) | 1 |
| (MIT OR Apache-2.0) | 1 |
| (MIT OR WTFPL) | 1 |
| (WTFPL OR MIT) | 1 |
| Apache-2.0 AND LGPL-3.0-or-later | 1 |
| CC-BY-4.0 | 1 |
| CC0-1.0 | 1 |
| EPL-2.0 | 1 |
| MIT and ISC | 1 |
| Python-2.0 | 1 |
| WTFPL | 1 |
| WTFPL OR ISC | 1 |

### Fora das licenças permissivas

| Pacote | Licença | Vai junto | Por que serve |
|---|---|---|---|
| @img/sharp-win32-x64 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later | sim | O binário pronto do sharp, com a libvips sob a LGPL nas próprias DLLs (libvips-42.dll). Elas vão sem mudanças, como bibliotecas separadas que o usuário pode trocar, com o aviso delas e o código-fonte em https://github.com/libvips/libvips, o que a LGPL permite num produto fechado. |
| elkjs 0.11.1 | EPL-2.0 | não | O layout de grafos do Prisma Studio, no CLI do Prisma, uma ferramenta de desenvolvimento: ele não vai junto. |
| lightningcss 1.32.0 | MPL-2.0 | não | O compilador de CSS do Tailwind, usado só no build: o CSS que ele escreve é do projeto, e o compilador não vai junto. |
| lightningcss 1.33.0 | MPL-2.0 | não | O compilador de CSS do Tailwind, usado só no build: o CSS que ele escreve é do projeto, e o compilador não vai junto. |
| lightningcss-win32-x64-msvc 1.32.0 | MPL-2.0 | não | O compilador de CSS do Tailwind, usado só no build: o CSS que ele escreve é do projeto, e o compilador não vai junto. |
| lightningcss-win32-x64-msvc 1.33.0 | MPL-2.0 | não | O compilador de CSS do Tailwind, usado só no build: o CSS que ele escreve é do projeto, e o compilador não vai junto. |

### Bibliotecas Android

Todas as bibliotecas do release do app do celular, 179 delas, da árvore do Gradle: o `gradlew :app:writeLicenses` as grava, com as licenças que os POMs delas indicam, no `apps/mobile/android/licenses.json`, e o workflow Android falha quando o arquivo está desatualizado. O THIRD_PARTY_NOTICES.md lista cada uma.

| Licença | Bibliotecas |
|---|---|
| Apache-2.0 | 143 |
| MIT | 24 |
| ML Kit Terms of Service | 6 |
| Android Software Development Kit License | 4 |
| Apache-2.0 AND BSD-3-Clause | 1 |
| BSD-3-Clause | 1 |

### Dados de veículos

As marcas e modelos de veículos com que um servidor começa (`STARTING_VEHICLE_BRANDS` em `@apc/domain/vehicle-lists`) são só nomes: fatos, que nenhuma licença cobre. Eles foram reunidos de fontes confiáveis e gratuitas cujos termos permitem esse uso, e só para confirmar que cada modelo existe e foi vendido no Brasil. Nada foi pago, licenciado ou tirado de dados exclusivos de associados, nenhum site foi raspado contra os termos dele, e nenhum texto, foto, descrição ou preço foi copiado.

- **Wikipédia em português:** o artigo de cada modelo, ou o da marca dele, lido pela API da Wikimedia uma requisição por vez, como a etiqueta dela pede, para confirmar que o modelo foi vendido no Brasil. Os [Termos de Uso da Wikimedia](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use) deixam os fatos serem reusados livremente, sem atribuição; o texto dos artigos (CC BY-SA 4.0) não foi copiado.
- **O informativo público da FENABRAVE de dezembro de 2025:** os nomes das 21 marcas mais vendidas no Brasil em 2025, para escolher as marcas. Nenhum número foi guardado.
- **Deixados de fora:** um modelo que nenhuma dessas fontes confirmou. Não usados: a FIPE (todos os direitos reservados, e a tabela completa dela é vendida), as APIs e cópias da tabela dela que outros publicam, TecDoc, Car2DB, Teoalida e os dados exclusivos de associados da FENABRAVE.

### Contribuições

Contribuições de fora só são aceitas com uma cessão dos direitos delas assinada (CLA), para o código manter um só autor e poder ter a licença trocada ou ser vendido.

Isto não é aconselhamento jurídico: antes de vender o produto, peça a um advogado que revise a licença e esta auditoria.
