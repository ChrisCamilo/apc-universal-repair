module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // A component's look lives in its recipe (AGENTS.md, "Styles"), so a style object written in the JSX fails.
    'react-native/no-inline-styles': 'error',
  },
};
