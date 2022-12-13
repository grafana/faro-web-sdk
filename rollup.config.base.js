const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const terser = require('@rollup/plugin-terser');
const typescript = require('@rollup/plugin-typescript');

const modules = {
  core: {
    name: '@grafana/faro-core',
    bundleName: 'faro-core',
    globalName: 'GrafanaFaroCore',
    externals: [],
  },
  react: {
    name: '@grafana/react',
    bundleName: 'faro-react',
    globalName: 'GrafanaFaroReact',
    externals: ['webSdk', 'webTracing'],
  },
  webSdk: {
    name: '@grafana/faro-web-sdk',
    bundleName: 'faro-web-sdk',
    globalName: 'GrafanaFaroWebSdk',
    externals: [],
  },
  webTracing: {
    name: '@grafana/faro-web-tracing',
    bundleName: 'faro-web-tracing',
    globalName: 'GrafanaFaroWebTracing',
    externals: ['webSdk'],
  },
};

exports.getRollupConfigBase = (moduleName) => {
  const module = modules[moduleName];

  return {
    input: './src/index.ts',
    output: {
      file: `./dist/bundle/${module.bundleName}.iife.js`,
      format: 'iife',
      globals: module.externals.reduce(
        (acc, external) => ({
          ...acc,
          [modules[external].name]: modules[external].globalName,
        }),
        {}
      ),
      name: module.globalName,
    },
    external: module.externals.map((external) => modules[external].name),
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        cacheDir: '../../.cache/rollup',
        inlineSources: false,
        outputToFilesystem: true,
        sourceMap: false,
        tsconfig: './tsconfig.esm.json',
      }),
      terser(),
    ],
  };
};
