module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // The React Native 0.87 preset no longer turns `export * as ns from` into CommonJS, which zod's ESM build (through
  // @apc/shared) uses, so the Metro bundle fails without it. Jest loads zod's CommonJS build and doesn't need it.
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
