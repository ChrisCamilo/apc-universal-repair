# Licenses · Licenças

[🇺🇸 English](#-english-us) · [🇧🇷 Português](#-português-brasil)

Written by `node scripts/licenses.mjs write`; don't edit by hand · Escrito pelo `node scripts/licenses.mjs write`; não edite à mão.

---

## 🇺🇸 English (US)

APC Universal Repair is all rights reserved ([LICENSE](../LICENSE), `UNLICENSED` in every `package.json`). This is the audit of every package it installs, so a sold, closed product meets their licenses. `node scripts/licenses.mjs check` keeps it true in CI.

- **Permissive** (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, Unlicense, CC0, WTFPL, Python-2.0, CC-BY-4.0, and OFL-1.1 for the fonts): fine in a closed, sold product. They ask to keep their notice, which [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) does, shipped with the installer and the APK. OFL fonts can't be sold on their own, only inside the product.
- **Weak copyleft** (LGPL, MPL, EPL): only as reviewed below, unchanged and as separate libraries, or in tools that don't ship.
- **Strong copyleft** (GPL, AGPL, SSPL): none is installed. One in what ships would ask to open the project's code, so CI refuses any new one.
- **Shipped:** 364 npm packages, plus the Android libraries the phone app declares and Electron with Chromium, which ship their own notices.

### Every installed package, by license

1375 packages, development ones included:

| License | Packages |
|---|---|
| MIT | 1129 |
| ISC | 80 |
| Apache-2.0 | 60 |
| BSD-3-Clause | 38 |
| BSD-2-Clause | 27 |
| BlueOak-1.0.0 | 11 |
| OFL-1.1 | 6 |
| (MIT OR CC0-1.0) | 4 |
| MPL-2.0 | 4 |
| 0BSD | 2 |
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

Declared by the phone app's native modules (`android/build.gradle` of each). Resolving their full tree takes the Android SDK, so they are listed by hand; check them with `gradlew :app:dependencies` when the release APK is built ([#97](https://github.com/ChrisCamilo/apc-universal-repair/issues/97)).

| Library | License |
|---|---|
| androidx.* (AndroidX: appcompat, core, room, datastore, biometric, fragment, lifecycle…) | Apache-2.0 |
| com.facebook.react:react-android, com.facebook.react:hermes-android | MIT |
| com.facebook.fresco:* | MIT |
| com.facebook.fbjni:fbjni | Apache-2.0 |
| com.facebook.soloader:soloader | Apache-2.0 |
| com.facebook.yoga:* | MIT |
| com.facebook.infer.annotation:infer-annotation | MIT |
| com.google.code.findbugs:jsr305 | BSD-3-Clause |
| com.squareup.okhttp3:*, com.squareup.okio:okio | Apache-2.0 |
| io.github.react-native-async-storage:shared-storage-android | MIT |
| org.jetbrains.kotlin:kotlin-stdlib, org.jetbrains.kotlinx:kotlinx-coroutines-android | Apache-2.0 |

### Contributions

Outside contributions are only taken with a signed assignment of their rights (CLA), so the code keeps one author and can be relicensed or sold.

This isn't legal advice: before selling the product, have a lawyer review the license and this audit.

---

## 🇧🇷 Português (Brasil)

O APC Universal Repair tem todos os direitos reservados ([LICENSE](../LICENSE), `UNLICENSED` em todo `package.json`). Esta é a auditoria de todos os pacotes que ele instala, para que um produto fechado e vendido cumpra as licenças deles. O `node scripts/licenses.mjs check` a mantém verdadeira no CI.

- **Permissivas** (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, Unlicense, CC0, WTFPL, Python-2.0, CC-BY-4.0, e a OFL-1.1 das fontes): servem num produto fechado e vendido. Elas pedem que o aviso delas seja mantido, o que o [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) faz, levado com o instalador e o APK. As fontes OFL não podem ser vendidas sozinhas, só dentro do produto.
- **Copyleft fraco** (LGPL, MPL, EPL): só como revisado abaixo, sem mudanças e como bibliotecas separadas, ou em ferramentas que não vão junto.
- **Copyleft forte** (GPL, AGPL, SSPL): nenhuma está instalada. Uma no que vai junto pediria para abrir o código do projeto, então o CI recusa qualquer nova.
- **O que vai junto:** 364 pacotes npm, mais as bibliotecas Android que o app do celular declara e o Electron com o Chromium, que levam os próprios avisos.

### Todos os pacotes instalados, por licença

1375 pacotes, os de desenvolvimento inclusive:

| Licença | Pacotes |
|---|---|
| MIT | 1129 |
| ISC | 80 |
| Apache-2.0 | 60 |
| BSD-3-Clause | 38 |
| BSD-2-Clause | 27 |
| BlueOak-1.0.0 | 11 |
| OFL-1.1 | 6 |
| (MIT OR CC0-1.0) | 4 |
| MPL-2.0 | 4 |
| 0BSD | 2 |
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

Declaradas pelos módulos nativos do app do celular (o `android/build.gradle` de cada um). Resolver a árvore completa delas pede o Android SDK, então elas são listadas à mão; confira com o `gradlew :app:dependencies` quando o APK de release for gerado ([#97](https://github.com/ChrisCamilo/apc-universal-repair/issues/97)).

| Biblioteca | Licença |
|---|---|
| androidx.* (AndroidX: appcompat, core, room, datastore, biometric, fragment, lifecycle…) | Apache-2.0 |
| com.facebook.react:react-android, com.facebook.react:hermes-android | MIT |
| com.facebook.fresco:* | MIT |
| com.facebook.fbjni:fbjni | Apache-2.0 |
| com.facebook.soloader:soloader | Apache-2.0 |
| com.facebook.yoga:* | MIT |
| com.facebook.infer.annotation:infer-annotation | MIT |
| com.google.code.findbugs:jsr305 | BSD-3-Clause |
| com.squareup.okhttp3:*, com.squareup.okio:okio | Apache-2.0 |
| io.github.react-native-async-storage:shared-storage-android | MIT |
| org.jetbrains.kotlin:kotlin-stdlib, org.jetbrains.kotlinx:kotlinx-coroutines-android | Apache-2.0 |

### Contribuições

Contribuições de fora só são aceitas com uma cessão dos direitos delas assinada (CLA), para o código manter um só autor e poder ter a licença trocada ou ser vendido.

Isto não é aconselhamento jurídico: antes de vender o produto, peça a um advogado que revise a licença e esta auditoria.
