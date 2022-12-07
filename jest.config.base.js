const { join } = require('node:path');

exports.jestBaseConfig = {
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['src'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: join(__dirname, 'tsconfig.spec.json'),
        useESM: true,
      },
    ],
  },
};
