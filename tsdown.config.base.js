/**
 * Shared tsdown configuration for every publishable package.
 *
 * Each package produces four things, and the paths are a published contract:
 * - dist/cjs   CommonJS, one file per source file, referenced by the "main" field
 * - dist/esm   ES modules, one file per source file, referenced by the "module" field
 * - dist/types declarations, referenced by the "types" field
 * - dist/bundle/<bundleName>.iife.js  minified bundle served from unpkg
 *
 * Do not change any of those paths without treating it as a breaking change.
 */

// Every source file is an entry, not just index.ts. With a single entry, Rolldown tree-shakes
// exports that index.ts does not reach out of the declarations while keeping them in the emitted
// JavaScript, which would make the two disagree for anyone importing a module directly.
const SOURCES = [
  './src/**/*.ts',
  './src/**/*.tsx',
  '!./src/**/*.test.ts',
  '!./src/**/*.test.tsx',
  '!./src/**/__matrix__/**',
];

/**
 * @param {object} options
 * @param {string} options.bundleName Name of the bundle file, without the `.iife.js` suffix.
 * @param {string} options.globalName Global variable the bundle assigns itself to.
 * @param {Record<string, string>} [options.bundleExternals] Packages kept out of the bundle, mapped
 *   to the global variable they are read from at run time.
 * @param {Array<string | RegExp>} [options.bundleInlines] Packages that must end up inside the
 *   bundle even though they are listed in `dependencies`. tsdown externalises dependencies by
 *   default, for every output format, so anything the bundle needs to carry has to be named here.
 */
exports.getTsdownConfigBase = ({ bundleName, globalName, bundleExternals = {}, bundleInlines = [] }) => {
  const shared = {
    entry: SOURCES,
    platform: 'browser',
    // Matches the "target" in tsconfig.base.json. Note that Rolldown applies this to dependencies
    // as well, which the previous Rollup build did not.
    target: 'es2015',
    sourcemap: true,
    hash: false,
  };

  return [
    {
      ...shared,
      format: 'cjs',
      unbundle: true,
      outDir: './dist/cjs',
      outExtensions: () => ({ js: '.js' }),
      dts: false,
    },
    {
      ...shared,
      format: 'esm',
      unbundle: true,
      outDir: './dist/esm',
      outExtensions: () => ({ js: '.js' }),
      dts: false,
    },
    {
      // Declarations only. tsconfig.esm.json sets isolatedDeclarations, which lets Oxc generate
      // these instead of the TypeScript compiler.
      ...shared,
      format: 'esm',
      unbundle: true,
      outDir: './dist/types',
      tsconfig: './tsconfig.esm.json',
      outExtensions: () => ({ dts: '.d.ts' }),
      // Keep every package import external in the declarations. Without this, declarations for
      // types that reach us through a dependency get copied into dist/types under a node_modules
      // directory, which would republish another project's types as if they were ours.
      deps: { dts: { neverBundle: true } },
      // Declaration maps are not emitted, so do not leave a sourceMappingURL comment behind that
      // points at a file which does not exist.
      sourcemap: false,
      dts: { emitDtsOnly: true, sourcemap: false },
    },
    {
      ...shared,
      format: 'iife',
      entry: { [bundleName]: './src/index.ts' },
      outDir: './dist/bundle',
      globalName,
      deps: {
        neverBundle: Object.keys(bundleExternals),
        alwaysBundle: bundleInlines,
      },
      outputOptions: {
        globals: bundleExternals,
      },
      minify: true,
      dts: false,
    },
  ];
};
