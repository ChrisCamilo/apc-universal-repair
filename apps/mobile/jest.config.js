module.exports = {
  preset: '@react-native/jest-preset',
  // Same packages the preset transforms, also when pnpm keeps them under node_modules/.pnpm
  // (folder names like "react-native@0.87.1" or "@react-native+jest-preset@0.87.1").
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/)?((jest-)?react-native|@react-native(-community)?)[/+@])',
  ],
};
