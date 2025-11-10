import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  // Global ignores
  {
    ignores: [
      // Git
      '.git/**',
      // IDEs
      '.idea/**',
      '.vscode/**',
      // App-specifics
      '.cache/**',
      '.eslintcache/**',
      '.husky/**',
      'coverage/**',
      'cypress/videos/**',
      'cypress/screenshots/**',
      'demo/logs/**',
      'demo/stats.html',
      'demo/vite.config.ts.timestamp-*.mjs',
      '**/dist/**',
      '**/node_modules/**',
      // Logs
      '*.log',
      'lerna-debug.log*',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      // Misc
      '.DS_Store',
      // Root config files that don't need linting
      '.lintstagedrc.js',
      '.prettierrc.js',
      // App plugin
      'infra/grafana/plugins/**',
      'infra/grafana/plugins-provisioning/*.yaml',
    ],
  },

  // Base JavaScript configuration
  js.configs.recommended,

  // Main configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: 'tsconfig.base.json',
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser APIs
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        fetch: 'readonly',
        performance: 'readonly',
        self: 'readonly',
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      import: importPlugin,
      'no-only-tests': noOnlyTests,
      react: react,
      'react-hooks': reactHooks,
    },
    settings: {
      'import/resolver': {
        node: {
          moduleDirectory: ['node_modules'],
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Import rules
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', orderImportKind: 'desc', caseInsensitive: true },
          'newlines-between': 'always',
          groups: [['builtin', 'external'], ['internal'], ['parent'], ['sibling', 'index']],
          pathGroups: [
            {
              pattern: '@grafana/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['@grafana/**'],
        },
      ],
      'import/no-unresolved': 'off', // Disabled due to TypeScript resolver issues
      'import/named': 'off',
      'import/default': 'off',
      'import/namespace': 'off',
      'import/export': 'off',

      // Duplicate imports
      'import/no-duplicates': 'error',

      // Testing rules
      'no-only-tests/no-only-tests': 'error',

      // TypeScript rules for unused variables
      'no-unused-vars': 'off', // Disable base rule for TypeScript files
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          args: 'after-used',
        },
      ],

      // React rules
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'error',

      // Sort imports
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
    },
  },

  // Configuration for web-tracing package with restricted imports
  {
    files: ['packages/web-tracing/**/*.ts'],
    ignores: ['packages/web-tracing/**/*.test.ts'],
    rules: {
      // Disallow importing core from web tracing
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@grafana/faro-core',
              message: 'Import from @grafana/faro-web-sdk instead of @grafana/faro-core.',
            },
          ],
          patterns: ['@grafana/faro-core/*'],
        },
      ],
    },
  },

  // Configuration for test files
  {
    files: [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/*TestHelpers.{js,jsx,ts,tsx}',
      '**/*testHelpers.{js,jsx,ts,tsx}',
      '**/testUtils/**/*.{js,jsx,ts,tsx}',
      '**/test-utils/**/*.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      // Allow only tests in test files for debugging purposes
      'no-only-tests/no-only-tests': 'warn',
      // Allow modifying global objects in tests for mocking purposes
      'no-global-assign': 'off',
      // Allow escape characters in tests for testing edge cases
      'no-useless-escape': 'off',
    },
  },

  // Configuration for configuration files
  {
    files: ['*.config.{js,ts,mjs}', '.eslintrc.{js,cjs}', 'rollup.config.{js,ts}'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        process: 'readonly',
      },
    },
  },

  // Configuration for Node.js files
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
      parserOptions: {
        project: null,
      },
    },
  },
];
