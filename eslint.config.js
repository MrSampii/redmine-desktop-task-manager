const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  DOMParser: 'readonly',
  URL: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  fetch: 'readonly',
  structuredClone: 'readonly',
  __dirname: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  URL: 'readonly',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'test-artifacts/**',
      '.git/**',
      '.playwright/**',
    ],
  },
  {
    files: ['src/main/**/*.js', 'src/preload/**/*.js', 'src/shared/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      'no-shadow': 'warn',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['scripts/e2e-electron-full-test.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...nodeGlobals,
        document: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: browserGlobals,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      'no-shadow': 'warn',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
];
