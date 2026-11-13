exports.jestBaseConfig = {
  verbose: true,
  moduleNameMapper: {
    '@grafana/faro-core$': '<rootDir>/packages/core/src/index.ts',
    '@grafana/faro-core/internal$': '<rootDir>/packages/core/src/internal/index.ts',
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

// Only applied when running with `--coverage`. Restricts coverage to the package's own sources, so
// code pulled in from other packages (mapped sources or built dist) and test helpers are not reported.
exports.jestCoverageConfig = (packageDir) => ({
  collectCoverageFrom: [
    `${packageDir}/src/**/*.{ts,tsx}`,
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
    '!**/testUtils/**',
    '!**/__matrix__/**',
    '!**/*TestHelpers.ts',
    '!**/*TestData.ts',
  ],
  coverageDirectory: `<rootDir>/${packageDir}/coverage`,
});
