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
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
      },
    ],
    'no-duplicate-imports': 'off',
    '@typescript-eslint/no-duplicate-imports': ['error'],
    'no-only-tests/no-only-tests': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'error',
    'semi': [2, 'always']
  },
};
