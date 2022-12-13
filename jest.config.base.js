exports.jestBaseConfig = {
  moduleNameMapper: {
    '@grafana/faro-core/src/(.*)': '<rootDir>/core/src/$1',
  },
  rootDir: '../',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
};
