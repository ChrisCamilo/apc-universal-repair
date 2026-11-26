import { language, texts } from "../texts.ts";

// The pages the window shows while the app starts the server it ships (see serverSettings.ts) and while it stops it
// and closes to install a new version (see main.ts), so no one opens it again in the middle of the install: a spinner
// and what goes on, in the main process's language and the eighties/night colors. Each is written whole into a data:
// address, with no script.

/** The pages' look, the same for both. */
const STYLE = `
html, body { height: 100%; margin: 0; }
body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #0b0c0e;
  color: #e8e6e1;
  font: 16px system-ui, sans-serif;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(232, 230, 225, 0.25);
  border-top-color: #ffa31a;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
p { margin: 0; }
.hint { color: rgba(232, 230, 225, 0.6); font-size: 14px; }
`;

/** Which page: while the server starts, or while an update goes in. */
export type StatusPage = "starting" | "updating";

/**
 * Writes a page, in the main process's language.
 * @param page Which page.
 * @returns Its data: address, for the window to load.
 */
export function statusPage(page: StatusPage): string {
  const { busy, title, hints } = texts().pages[page];
  const html = `<!doctype html>
<html lang="${language()}">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'" />
    <title>APC Universal Repair</title>
    <style>${STYLE}</style>
  </head>
  <body>
    <div class="spinner" role="progressbar" aria-label="${busy}"></div>
    <p>${title}</p>
    ${hints.map((hint) => `<p class="hint">${hint}</p>`).join("\n    ")}
  </body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
