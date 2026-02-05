const { jestBaseConfig } = require('../../jest.config.base.js');
const path = require('path');

module.exports = {
  ...jestBaseConfig,
  roots: ['packages/react/src'],
  transform: {
    '^.+\\.(ts|tsx)?$': [
      'ts-jest',
      {
        tsconfig: path.join(__dirname, 'tsconfig.spec.json'),
      },
    ],
  },
};
