exports.jestBaseConfig = {
  verbose: true,
  moduleNameMapper: {
    '@grafana/faro-core/src/(.*)': '<rootDir>/packages/core/src/$1',
  },
  rootDir: '../../',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
};
