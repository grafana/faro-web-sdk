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
    externals: ['web', 'webTracing'],
  },
  web: {
    name: '@grafana/faro-web-sdk',
    bundleName: 'faro-web-sdk',
    globalName: 'GrafanaFaroWebSdk',
    externals: [],
  },
  webTracing: {
    name: '@grafana/faro-web-tracing',
    bundleName: 'faro-web-tracing',
    globalName: 'GrafanaFaroWebTracing',
    externals: ['web'],
  },
};

module.exports = {
  getRollupConfigBase: (moduleName) => {
    const module = modules[moduleName];

    return {
      input: 'src/index.ts',
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
          inlineSources: false,
          sourceMap: false,
          cacheDir: '../../.cache/rollup',
          outputToFilesystem: false,
        }),
        terser(),
      ],
    };
  },
};
