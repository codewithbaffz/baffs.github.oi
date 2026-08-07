module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect', jsxRuntime: 'automatic' },
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['dist', 'build', 'node_modules'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': 'off',
    'react-refresh/only-export-components': 'off',
    // Turn off strict unused-imports rules to reduce noise in CI. We'll prefer
    // fixing actual runtime issues (like undefined variables) rather than failing
    // the build for icon imports that are intentionally left for future use.
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': ['warn', { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }],
  },
};
