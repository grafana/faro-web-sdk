module.exports = {
  extends: ['@grafana/eslint-config', 'plugin:import/errors', 'plugin:import/warnings', 'plugin:import/typescript'],
  plugins: ['eslint-plugin-no-only-tests'],
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules'],
      },
    },
  },
  rules: {
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
    'no-duplicate-imports': 'off',
    '@typescript-eslint/no-duplicate-imports': ['error'],
    'no-only-tests/no-only-tests': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'error',
    'sort-imports': [
      'error',
      {
        ignoreCase: true,
        ignoreDeclarationSort: true,
      },
    ],
  },
  parserOptions: {
    project: 'tsconfig.base.json',
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ["packages/web-tracing/**/*.ts"],
      excludedFiles: ["packages/web-tracing/**/*.test.ts"],
      rules: {
        // Disallow importing core from web tracing
        "no-restricted-imports": ["error", {        
          paths: [
            { name: "@grafana/faro-core", message: "Import from @grafana/faro-web-sdk instead of @grafana/faro-core." }
          ],          
          patterns: [
            "@grafana/faro-core/*"
          ]
        }]
      }
    }
  ]
};
