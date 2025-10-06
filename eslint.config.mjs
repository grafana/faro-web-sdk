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
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
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
      'no-duplicate-imports': 'off',
      '@typescript-eslint/no-duplicate-imports': ['error'],

      // Testing rules
      'no-only-tests/no-only-tests': 'error',

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
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
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
    files: ['**/*.{js,cjs}'],
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
    },
  },
];