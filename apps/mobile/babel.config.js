/**
 * Writes the API's address a release is built with, `APC_API_URL`, into the bundle in place of
 * `process.env.APC_API_URL` (src/api.ts). Without it in the environment the code is left as it is, as in development and
 * Jest. metro.config.js keys Metro's cache on it, so a new address bundles again.
 * @param {{ types: import('@babel/core').types }} babel Babel's API.
 * @returns {import('@babel/core').PluginObj} The plugin.
 */
function inlineApiUrl({ types: t }) {
  return {
    visitor: {
      MemberExpression(path) {
        const url = process.env.APC_API_URL;
        if (url && path.matchesPattern('process.env.APC_API_URL')) {
          path.replaceWith(t.stringLiteral(url));
        }
      },
    },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // The React Native 0.87 preset no longer turns `export * as ns from` into CommonJS, which zod's ESM build (through
  // @apc/shared) uses, so the Metro bundle fails without it. Jest loads zod's CommonJS build and doesn't need it.
  plugins: ['@babel/plugin-transform-export-namespace-from', inlineApiUrl],
};
