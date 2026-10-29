// The licenses of the packages the project installs, and what the product owes them (#252). The project itself is
// all rights reserved (LICENSE, "UNLICENSED"), so nothing it ships may ask to open its code:
// - `node scripts/licenses.mjs check` (CI) fails when an installed package, development ones included, has a license
//   outside ALLOWED that isn't one of the REVIEWED exceptions, and when THIRD_PARTY_NOTICES.md misses a package that
//   ships;
// - `node scripts/licenses.mjs write` writes THIRD_PARTY_NOTICES.md, with the license text of every package that
//   ships, as MIT, BSD and Apache ask, copied into the installer and the APK, and docs/licenses.md, the audit's
//   report. Run it after adding or upgrading a dependency.
// What ships: the production dependencies of the apps (the web build, the desktop app with the server it bundles, and
// the phone app) and of the shared package, the native modules the desktop server installs on its own, and the
// Android libraries in the phone app's release, which `gradlew :app:writeLicenses` writes to
// apps/mobile/android/licenses.json with the licenses their POMs name, since resolving them takes the Android SDK (the
// Android workflow checks the file is up to date). Electron and Chromium ship their own notices beside the app
// (LICENSE.electron.txt and LICENSES.chromium.html). The npm lists come from `pnpm licenses list`.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** The licenses allowed without review: permissive ones, which ask only to keep their notice. */
export const ALLOWED = new Set([
  "0BSD",
  "Apache-2.0",
  "BlueOak-1.0.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC-BY-4.0",
  "CC0-1.0",
  "ISC",
  "MIT",
  "OFL-1.1",
  "Python-2.0",
  "Unlicense",
  "WTFPL",
]);
/** The repository's folder. */
const ROOT = path.join(import.meta.dirname, "..");
/** The phone app's release libraries and the licenses their POMs name, as `gradlew :app:writeLicenses` writes them. */
const ANDROID_LICENSES_FILE = path.join(ROOT, "apps", "mobile", "android", "licenses.json");
/** The notices' copy in the phone app, which Android packs into the APK. */
const NOTICES_ANDROID = path.join(ROOT, "apps", "mobile", "android", "app", "src", "main", "assets", "THIRD_PARTY_NOTICES.md");
/** The notices shipped with the installer and the APK. */
export const NOTICES_FILE = path.join(ROOT, "THIRD_PARTY_NOTICES.md");
/**
 * The SPDX id of each license name the Android libraries' POMs use, which they spell their own way. A name none of
 * them matches is kept as it is, so the check fails on it until it's added here or reviewed.
 */
const POM_LICENSES = [
  { name: /^(the )?apache( software)? license,? version 2\.0$|^apache-2(\.0)?$/i, spdx: "Apache-2.0" },
  // Bolts-Android's: the BSD license with three clauses (https://github.com/BoltsFramework/Bolts-Android).
  { name: /^bsd license$/i, spdx: "BSD-3-Clause" },
  { name: /^mit( license)?$/i, spdx: "MIT" },
];
/** The audit's report. */
const REPORT_FILE = path.join(ROOT, "docs", "licenses.md");
/**
 * The packages outside ALLOWED, each reviewed: what it is, why it is fine, in English and Portuguese, and the license
 * it may carry.
 */
export const REVIEWED = [
  {
    name: /^@img\/sharp-(?!libvips)/,
    license: "LGPL-3.0-or-later",
    en: "sharp's prebuilt binary, with libvips under the LGPL as its own DLLs (libvips-42.dll). They ship unchanged, as separate libraries the user can replace, with their notice and their source at https://github.com/libvips/libvips, which the LGPL allows in a closed product.",
    pt: "O binário pronto do sharp, com a libvips sob a LGPL nas próprias DLLs (libvips-42.dll). Elas vão sem mudanças, como bibliotecas separadas que o usuário pode trocar, com o aviso delas e o código-fonte em https://github.com/libvips/libvips, o que a LGPL permite num produto fechado.",
  },
  {
    name: /^@img\/sharp-libvips/,
    license: "LGPL-3.0-or-later",
    en: "libvips itself, prebuilt for sharp, under the LGPL: the same as above.",
    pt: "A própria libvips, pronta para o sharp, sob a LGPL: o mesmo que acima.",
  },
  {
    name: /^lightningcss/,
    license: "MPL-2.0",
    en: "Tailwind's CSS compiler, used only while building: the CSS it writes is the project's own, and the compiler doesn't ship.",
    pt: "O compilador de CSS do Tailwind, usado só no build: o CSS que ele escreve é do projeto, e o compilador não vai junto.",
  },
  {
    name: /^elkjs$/,
    license: "EPL-2.0",
    en: "The graph layout of Prisma Studio, in the Prisma CLI, a development tool: it doesn't ship.",
    pt: "O layout de grafos do Prisma Studio, no CLI do Prisma, uma ferramenta de desenvolvimento: ele não vai junto.",
  },
];
/** The workspace packages whose production dependencies ship. */
const SHIPPED = ["@apc/api", "@apc/desktop", "@apc/mobile", "@apc/shared", "@apc/web"];
/** What ships besides them: sharp's binary for Windows, an optional dependency the desktop server installs. */
const SHIPPED_EXTRA = /^@img\/sharp-(win32-x64|libvips-win32-x64)$/;

/**
 * Tells whether an SPDX license expression is allowed without review: one of its OR choices with every AND part in
 * ALLOWED, e.g. "(MIT OR Apache-2.0)" or "MIT AND ISC".
 * @param expression The package's license, as package.json says it.
 * @returns True when allowed.
 */
export function allowed(expression) {
  return expression
    .replace(/[()]/g, "")
    .split(/\s+or\s+/i)
    .some((choice) => choice.split(/\s+and\s+/i).every((part) => ALLOWED.has(part.trim())));
}

/**
 * Reads the phone app's release Android libraries, as `gradlew :app:writeLicenses` wrote them.
 * @returns Each library by name ("group:artifact") and version, with its license as an SPDX expression ("NONE" when
 *   its POM names none) and the link its POM gives for the license's text.
 */
export function androidLibraries() {
  return JSON.parse(readFileSync(ANDROID_LICENSES_FILE, "utf8")).map(({ module, version, licenses }) => ({
    name: module,
    version,
    license: licenses.map(({ name }) => pomLicense(name)).join(" AND ") || "NONE",
    source: licenses[0]?.url ?? "",
  }));
}

/**
 * Lists the installed packages, as `pnpm licenses list` does.
 * @param options Whether to list only production dependencies, and of which workspace package.
 * @returns Each package once per version: its name, version, license, folder, author and home page.
 */
function installed(options = {}) {
  const flags = ["--json", options.prod ? "--prod" : "", options.filter ? `--filter ${options.filter}` : ""].filter(Boolean);
  const text = execSync(`pnpm licenses list ${flags.join(" ")}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return Object.entries(JSON.parse(text)).flatMap(([license, packages]) =>
    packages.flatMap((entry) =>
      entry.versions.map((version, index) => ({
        name: entry.name,
        version,
        license,
        folder: entry.paths[index] ?? entry.paths[0],
        author: entry.author,
        homepage: entry.homepage,
      })),
    ),
  );
}

/**
 * Reads a package's license text from its folder.
 * @param folder The package's folder.
 * @returns The text of its LICENSE, LICENCE, COPYING or NOTICE file, or undefined when it has none.
 */
function licenseText(folder) {
  const file = existsSync(folder) ? readdirSync(folder).find((name) => /^(licen[cs]e|copying|notice)(\.|-|$)/i.test(name)) : undefined;
  return file ? readFileSync(path.join(folder, file), "utf8").trim() : undefined;
}

/**
 * Writes THIRD_PARTY_NOTICES.md: every package that ships, with its license text.
 * @param shipped The packages that ship, sorted.
 * @param android The phone app's release Android libraries.
 * @returns The file's text.
 */
function noticesText(shipped, android) {
  const fence = "~~~~";
  const packages = shipped.map(({ name, version, license, folder, author, homepage }) => {
    const text =
      licenseText(folder) ??
      [
        `${license}${author ? `, by ${author}` : ""}. The package has no license file; its package.json names the license.`,
        `License text: https://spdx.org/licenses/${license.replace(/[()]/g, "").split(/\s+/)[0]}.html`,
        ...(homepage ? [`Source: ${homepage}`] : []),
      ].join("\n");
    return `### ${name} ${version}\n\n${license}\n\n${fence}text\n${text}\n${fence}`;
  });
  return [
    "# Third-party notices",
    "",
    "APC Universal Repair is © Christian Camilo, all rights reserved (see LICENSE). It ships the open-source software below, each under its own license, whose notice is kept here as that license asks. Electron and Chromium ship their notices beside the app, in LICENSE.electron.txt and LICENSES.chromium.html.",
    "",
    "O APC Universal Repair é © Christian Camilo, todos os direitos reservados (veja o LICENSE). Ele leva os softwares de código aberto abaixo, cada um sob a própria licença, cujo aviso fica aqui como essa licença pede. O Electron e o Chromium levam os avisos deles ao lado do app, no LICENSE.electron.txt e no LICENSES.chromium.html.",
    "",
    "Written by `node scripts/licenses.mjs write`; don't edit by hand.",
    "",
    "## npm packages",
    "",
    packages.join("\n\n"),
    "",
    "## Android libraries",
    "",
    "Every library in the phone app's release, from its Gradle tree; each one's license text is at its link.",
    "",
    "| Library | License | License text |",
    "|---|---|---|",
    ...android.map(({ name, version, license, source }) => `| ${name} ${version} | ${license} | ${source} |`),
    "",
  ].join("\n");
}

/**
 * Turns the license name a POM gives into its SPDX id, through POM_LICENSES.
 * @param name The name, e.g. "The Apache Software License, Version 2.0".
 * @returns The SPDX id, e.g. "Apache-2.0", or the name as it is when POM_LICENSES doesn't know it.
 */
export function pomLicense(name) {
  return POM_LICENSES.find((each) => each.name.test(name.trim()))?.spdx ?? name;
}

/**
 * Lists what an installed set breaks: each package whose license is neither allowed nor reviewed for it.
 * @param packages The installed packages, with their licenses.
 * @returns A line for each, e.g. "left-pad 1.0.0: GPL-3.0"; empty when nothing breaks.
 */
export function problems(packages) {
  return packages
    .filter(({ name, license }) => !allowed(license) && !REVIEWED.some((review) => review.name.test(name) && license.includes(review.license)))
    .map(({ name, version, license }) => `${name} ${version}: ${license}`);
}

/**
 * Writes docs/licenses.md: the audit, in English and Portuguese.
 * @param all Every installed package, development ones included.
 * @param shipped The packages that ship.
 * @param android The phone app's release Android libraries.
 * @returns The file's text.
 */
function reportText(all, shipped, android) {
  const counts = (packages) =>
    Object.entries(Object.groupBy(packages, ({ license }) => license))
      .map(([license, group]) => [license, group.length])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([license, count]) => `| ${license} | ${count} |`);
  const reviewed = (language) =>
    all
      .filter(({ license }) => !allowed(license))
      .map(({ name, version, license }) => {
        const review = REVIEWED.find((each) => each.name.test(name));
        return `| ${name} ${version} | ${license} | ${shipped.some((each) => each.name === name) ? (language === "en" ? "yes" : "sim") : language === "en" ? "no" : "não"} | ${review?.[language] ?? ""} |`;
      });
  return [
    "# Licenses · Licenças",
    "",
    "[🇺🇸 English](#-english-us) · [🇧🇷 Português](#-português-brasil)",
    "",
    "Written by `node scripts/licenses.mjs write`; don't edit by hand · Escrito pelo `node scripts/licenses.mjs write`; não edite à mão.",
    "",
    "---",
    "",
    "## 🇺🇸 English (US)",
    "",
    "APC Universal Repair is all rights reserved ([LICENSE](../LICENSE), `UNLICENSED` in every `package.json`). This is the audit of every package it installs, so a sold, closed product meets their licenses. `node scripts/licenses.mjs check` keeps it true in CI.",
    "",
    "- **Permissive** (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, Unlicense, CC0, WTFPL, Python-2.0, CC-BY-4.0, and OFL-1.1 for the fonts): fine in a closed, sold product. They ask to keep their notice, which [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) does, shipped with the installer and the APK. OFL fonts can't be sold on their own, only inside the product.",
    "- **Weak copyleft** (LGPL, MPL, EPL): only as reviewed below, unchanged and as separate libraries, or in tools that don't ship.",
    "- **Strong copyleft** (GPL, AGPL, SSPL): none is installed. One in what ships would ask to open the project's code, so CI refuses any new one.",
    `- **Shipped:** ${shipped.length} npm packages, the ${android.length} Android libraries of the phone app's release, and Electron with Chromium, which ship their own notices.`,
    "",
    "### Every installed package, by license",
    "",
    `${all.length} packages, development ones included:`,
    "",
    "| License | Packages |",
    "|---|---|",
    ...counts(all),
    "",
    "### Outside the permissive licenses",
    "",
    "| Package | License | Ships | Why it's fine |",
    "|---|---|---|---|",
    ...reviewed("en"),
    "",
    "### Android libraries",
    "",
    `Every library in the phone app's release, ${android.length} of them, from its Gradle tree: \`gradlew :app:writeLicenses\` writes them, with the licenses their POMs name, to \`apps/mobile/android/licenses.json\`, and the Android workflow fails when the file is out of date. THIRD_PARTY_NOTICES.md lists each one.`,
    "",
    "| License | Libraries |",
    "|---|---|",
    ...counts(android),
    "",
    "### Contributions",
    "",
    "Outside contributions are only taken with a signed assignment of their rights (CLA), so the code keeps one author and can be relicensed or sold.",
    "",
    "This isn't legal advice: before selling the product, have a lawyer review the license and this audit.",
    "",
    "---",
    "",
    "## 🇧🇷 Português (Brasil)",
    "",
    "O APC Universal Repair tem todos os direitos reservados ([LICENSE](../LICENSE), `UNLICENSED` em todo `package.json`). Esta é a auditoria de todos os pacotes que ele instala, para que um produto fechado e vendido cumpra as licenças deles. O `node scripts/licenses.mjs check` a mantém verdadeira no CI.",
    "",
    "- **Permissivas** (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, Unlicense, CC0, WTFPL, Python-2.0, CC-BY-4.0, e a OFL-1.1 das fontes): servem num produto fechado e vendido. Elas pedem que o aviso delas seja mantido, o que o [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) faz, levado com o instalador e o APK. As fontes OFL não podem ser vendidas sozinhas, só dentro do produto.",
    "- **Copyleft fraco** (LGPL, MPL, EPL): só como revisado abaixo, sem mudanças e como bibliotecas separadas, ou em ferramentas que não vão junto.",
    "- **Copyleft forte** (GPL, AGPL, SSPL): nenhuma está instalada. Uma no que vai junto pediria para abrir o código do projeto, então o CI recusa qualquer nova.",
    `- **O que vai junto:** ${shipped.length} pacotes npm, as ${android.length} bibliotecas Android do release do app do celular, e o Electron com o Chromium, que levam os próprios avisos.`,
    "",
    "### Todos os pacotes instalados, por licença",
    "",
    `${all.length} pacotes, os de desenvolvimento inclusive:`,
    "",
    "| Licença | Pacotes |",
    "|---|---|",
    ...counts(all),
    "",
    "### Fora das licenças permissivas",
    "",
    "| Pacote | Licença | Vai junto | Por que serve |",
    "|---|---|---|---|",
    ...reviewed("pt"),
    "",
    "### Bibliotecas Android",
    "",
    `Todas as bibliotecas do release do app do celular, ${android.length} delas, da árvore do Gradle: o \`gradlew :app:writeLicenses\` as grava, com as licenças que os POMs delas indicam, no \`apps/mobile/android/licenses.json\`, e o workflow Android falha quando o arquivo está desatualizado. O THIRD_PARTY_NOTICES.md lista cada uma.`,
    "",
    "| Licença | Bibliotecas |",
    "|---|---|",
    ...counts(android),
    "",
    "### Contribuições",
    "",
    "Contribuições de fora só são aceitas com uma cessão dos direitos delas assinada (CLA), para o código manter um só autor e poder ter a licença trocada ou ser vendido.",
    "",
    "Isto não é aconselhamento jurídico: antes de vender o produto, peça a um advogado que revise a licença e esta auditoria.",
    "",
  ].join("\n");
}

/**
 * Lists the packages that ship: the production dependencies of the workspace packages, and SHIPPED_EXTRA.
 * @param all Every installed package, to find SHIPPED_EXTRA in.
 * @returns Each once, by name and version, sorted, the workspace's own left out.
 */
function shippedPackages(all) {
  const found = new Map();
  for (const filter of SHIPPED) {
    for (const entry of installed({ prod: true, filter })) {
      found.set(`${entry.name}@${entry.version}`, entry);
    }
  }
  for (const entry of all.filter(({ name }) => SHIPPED_EXTRA.test(name))) {
    found.set(`${entry.name}@${entry.version}`, entry);
  }
  return [...found.values()].filter(({ name }) => !name.startsWith("@apc/")).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version < b.version ? -1 : 1));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const command = process.argv[2];
  const all = installed();
  const android = androidLibraries();
  if (command === "check") {
    const found = [...problems(all), ...problems(android)];
    // Git may check the file out with CRLF line ends, on Windows.
    const notices = existsSync(NOTICES_FILE) ? readFileSync(NOTICES_FILE, "utf8").replace(/\r\n/g, "\n") : "";
    // The notices are written on Windows, whose optional native packages differ from Linux's: only what every
    // platform installs is checked.
    const missing = shippedPackages(all)
      .filter(({ name }) => !SHIPPED_EXTRA.test(name))
      .filter(({ name, version }) => !notices.includes(`### ${name} ${version}\n`))
      .map(({ name, version }) => `${name} ${version}`);
    for (const line of found) {
      console.error(
        `License not allowed: ${line}. Replace the package, or review it in scripts/licenses.mjs (REVIEWED); for an ` +
          "Android library whose POM spells a permissive license its own way, add the name to POM_LICENSES.",
      );
    }
    for (const line of missing) {
      console.error(`Not in THIRD_PARTY_NOTICES.md: ${line}. Run \`node scripts/licenses.mjs write\` on Windows.`);
    }
    console.log(
      `${all.length} packages and ${android.length} Android libraries checked, ${found.length} with a license not allowed, ` +
        `${missing.length} missing from the notices.`,
    );
    process.exitCode = found.length + missing.length > 0 ? 1 : 0;
  } else if (command === "write") {
    const shipped = shippedPackages(all);
    const notices = noticesText(shipped, android);
    writeFileSync(NOTICES_FILE, notices);
    writeFileSync(NOTICES_ANDROID, notices);
    writeFileSync(REPORT_FILE, reportText(all, shipped, android));
    console.log(
      `Wrote the notices of ${shipped.length} shipped packages and ${android.length} Android libraries, and the report of ${all.length}.`,
    );
  } else {
    console.error("Usage: node scripts/licenses.mjs <check | write>");
    process.exitCode = 1;
  }
}
