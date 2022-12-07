const { join } = require('node:path');

const jestBaseConfig = {
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['src'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: join(__dirname, 'tsconfig.spec.json'),
        useESM: true
      }
    ]
  }
};

module.exports = {
  jestBaseConfig,
};
