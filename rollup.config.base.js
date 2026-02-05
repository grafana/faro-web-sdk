const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const terser = require('@rollup/plugin-terser');
const typescript = require('@rollup/plugin-typescript');

// Common global names for peer dependencies
const PEER_DEPENDENCY_GLOBALS = {
  react: 'React',
  'react-dom': 'ReactDOM',
};

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
    peerDependencies: ['react', 'react-dom'],
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
  transportOtlpHttp: {
    name: '@grafana/faro-transport-otlp-http',
    bundleName: 'faro-transport-otlp-http',
    globalName: 'GrafanaFaroTransportOtlpHttp',
    externals: [],
  },
  instrumentationPerformanceTimeline: {
    name: '@grafana/faro-instrumentation-performance-timeline',
    bundleName: 'faro-instrumentation-performance-timeline',
    globalName: 'GrafanaFaroInstrumentationPerformanceTimeline',
    externals: [],
  },
  instrumentationFetch: {
    name: '@grafana/faro-instrumentation-fetch',
    bundleName: 'faro-instrumentation-fetch',
    globalName: 'GrafanaFaroInstrumentationFetch',
    externals: [],
  },
  instrumentationReplay: {
    name: '@grafana/faro-instrumentation-replay',
    bundleName: 'faro-instrumentation-replay',
    globalName: 'GrafanaFaroInstrumentationReplay',
    externals: [],
  },
  instrumentationXHR: {
    name: '@grafana/faro-instrumentation-xhr',
    bundleName: 'faro-instrumentation-xhr',
    globalName: 'GrafanaFaroInstrumentationXHR',
    externals: [],
  },
  instrumentationK6Browser: {
    name: '@grafana/faro-instrumentation-k6-browser',
    bundleName: 'faro-instrumentation-k6-browser',
    globalName: 'GrafanaFaroInstrumentationK6Browser',
    externals: [],
  },
};

exports.getRollupConfigBase = (moduleName) => {
  const module = modules[moduleName];

  // Get peer dependencies from module config
  const peerDependencies = module.peerDependencies ?? [];

  // Build globals mapping for peer dependencies
  const peerDependencyGlobals = peerDependencies.reduce((acc, dep) => {
    if (PEER_DEPENDENCY_GLOBALS[dep]) {
      acc[dep] = PEER_DEPENDENCY_GLOBALS[dep];
    }
    return acc;
  }, {});

  return {
    input: './src/index.ts',
    output: {
      file: `./dist/bundle/${module.bundleName}.iife.js`,
      format: 'iife',
      globals: {
        ...module.externals.reduce(
          (acc, external) => ({
            ...acc,
            [modules[external].name]: modules[external].globalName,
          }),
          {}
        ),
        ...peerDependencyGlobals,
      },
      name: module.globalName,
    },
    external: [
      ...module.externals.map((external) => modules[external].name),
      ...peerDependencies,
    ],
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
        tsconfig: './tsconfig.bundle.json',
      }),
      terser(),
    ],
  };
};
