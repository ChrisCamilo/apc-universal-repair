// The ports the API listens on, shared by the API, the desktop app, the web's dev server and E2E, and the phone, so
// each is written once. The API run from the repo for development (`pnpm dev`) listens on DEV_SERVER_PORT; the
// finished server, the one the desktop app ships and `pnpm start` runs, on SERVER_PORT. Apart, a development API
// never meets the desktop app's server, which holds the real data, on the same computer. PORT still moves either one.

/** The port of the API run for development, which the web's Vite proxy, the E2E and the phone's emulator reach. */
export const DEV_SERVER_PORT = 3333;
/** The port of the finished server: the desktop app's own, which the phone reaches at http://<its address>:3000. */
export const SERVER_PORT = 3000;
