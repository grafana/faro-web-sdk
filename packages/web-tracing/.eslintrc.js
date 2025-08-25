module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@grafana/faro-core',
            importNames: ['faro'],
            message: 'web-tracing must import faro from web-sdk instead of core',
          },
        ],
      },
    ],
  },
};
