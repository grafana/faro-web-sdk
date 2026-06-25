const path = require('path');

const { jestBaseConfig } = require('../../jest.config.base.js');

const repoRoot = path.join(__dirname, '..', '..');
const matrixTsconfig = path.join(__dirname, 'tsconfig.matrix.json');
const matrixEsmTsconfig = path.join(__dirname, 'tsconfig.matrix.esm.json');
const setupFile = path.join(__dirname, 'jest.setup.ts');
const fetchEnv = path.join(__dirname, 'jsdom-fetch.env.js');

const matrixDir = '<rootDir>/packages/react/src/router/__matrix__';

// Shared mapper from the base config (maps @grafana/faro-core to source).
const baseMapper = jestBaseConfig.moduleNameMapper;

// Pin react/react-dom to the v18 alias for the react-router v5 suite (RR v5 does
// not run on React 19). RTL resolves react/react-dom through these mappings too.
const react18Mapper = {
  '^react$': '<rootDir>/node_modules/react-18',
  '^react/(.*)$': '<rootDir>/node_modules/react-18/$1',
  '^react-dom$': '<rootDir>/node_modules/react-dom-18',
  '^react-dom/(.*)$': '<rootDir>/node_modules/react-dom-18/$1',
};

const routerMapper = (alias) => ({
  '^react-router$': `<rootDir>/node_modules/${alias}`,
  '^react-router/(.*)$': `<rootDir>/node_modules/${alias}/$1`,
});

// CJS project (react-router v5/v6/v7). ts-jest compiles to CommonJS.
const cjsProject = ({ displayName, testMatch, moduleNameMapper }) => ({
  displayName,
  testEnvironment: fetchEnv,
  rootDir: repoRoot,
  setupFilesAfterEnv: [setupFile],
  testMatch,
  moduleNameMapper: { ...baseMapper, ...moduleNameMapper },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: matrixTsconfig }],
  },
});

module.exports = {
  projects: [
    // Existing unit tests (mocked deps, profiler). Unchanged behaviour, React 19, CJS.
    {
      ...jestBaseConfig,
      displayName: 'react',
      rootDir: repoRoot,
      roots: ['packages/react/src'],
      testPathIgnorePatterns: ['/node_modules/', '/__matrix__/'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: path.join(__dirname, 'tsconfig.spec.json') }],
      },
    },

    // react-router v5 — runs on React 18 (see react18Mapper).
    cjsProject({
      displayName: 'rr-v5',
      testMatch: [`${matrixDir}/v5.test.tsx`],
      moduleNameMapper: react18Mapper,
    }),

    // react-router v6 — react-router resolves to the v6 alias.
    cjsProject({
      displayName: 'rr-v6',
      testMatch: [`${matrixDir}/v6.test.tsx`],
      moduleNameMapper: routerMapper('react-router-v6'),
    }),

    // react-router v7 — uses the plain `react-router` devDependency (7.x).
    cjsProject({
      displayName: 'rr-v7',
      testMatch: [`${matrixDir}/v7.test.tsx`],
      moduleNameMapper: {},
    }),

    // react-router v8 — ESM-only package, so this project runs in ESM mode.
    {
      displayName: 'rr-v8',
      testEnvironment: fetchEnv,
      rootDir: repoRoot,
      setupFilesAfterEnv: [setupFile],
      testMatch: [`${matrixDir}/v8.test.tsx`],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      // react-router v8 is exports-only (no main/module field), which jest's ESM
      // resolver can't resolve from a bare directory, so map to the dist entries.
      moduleNameMapper: {
        ...baseMapper,
        '^react-router$': '<rootDir>/node_modules/react-router-v8/dist/production/index.js',
        '^react-router/dom$': '<rootDir>/node_modules/react-router-v8/dist/production/dom-export.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: matrixEsmTsconfig, useESM: true }],
      },
    },
  ],
};
