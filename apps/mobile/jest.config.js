module.exports = {
  preset: '@react-native/jest-preset',
  // Same packages the preset transforms, plus AsyncStorage, also when pnpm keeps them under node_modules/.pnpm
  // (folder names like "react-native@0.87.1", "@react-native+jest-preset@0.87.1" or "@react-native-async-storage_<hash>").
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/)?((jest-)?react-native|@react-native(-community|-async-storage)?)[/+@_])',
  ],
  setupFiles: ['./jest.setup.js'],
};
