// The build-time values babel.config.js writes into a release bundle. The app has no Node types, so only these are
// declared.
declare const process: { env: { APC_API_URL?: string } };
