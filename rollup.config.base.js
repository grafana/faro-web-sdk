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
  rnSdk: {
    name: '@grafana/react-native-sdk',
    bundleName: 'react-native-sdk',
    globalName: 'GrafanaFaroReactNativeSdk',
    externals: [],
  },
  rnTracing: {
    name: '@grafana/react-native-tracing',
    bundleName: 'react-native-tracing',
    globalName: 'GrafanaFaroReactNativeTracing',
    externals: ['rnSdk'],
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
  instrumentationWebSocket: {
    name: '@grafana/faro-instrumentation-websocket',
    bundleName: 'faro-instrumentation-websocket',
    globalName: 'GrafanaFaroInstrumentationWebSocket',
    externals: [],
  },
  instrumentationOtelAxios: {
    name: '@grafana/faro-instrumentation-otel-axios',
    bundleName: 'faro-instrumentation-otel-axios',
    globalName: 'GrafanaFaroInstrumentationOtelAxios',
    externals: [],
  },
  instrumentationOtelReduxSaga: {
    name: '@grafana/faro-instrumentation-otel-redux-saga',
    bundleName: 'faro-instrumentation-otel-redux-saga',
    globalName: 'GrafanaFaroInstrumentationOtelReduxSaga',
    externals: [],
  },
};

exports.getRollupConfigBase = (moduleName) => {
  const module = modules[moduleName];

  const isReactNative = moduleName.startsWith('rn');

  const baseConfig = {
    input: './src/index.ts',
    output: {
      file: `./dist/bundle/${module.bundleName}.iife.js`,
      format: 'iife',
      globals: {
        'react-native': 'ReactNative',
        react: 'React',
        ...module.externals.reduce(
          (acc, external) => ({
            ...acc,
            [modules[external].name]: modules[external].globalName,
          }),
          {}
        ),
      },
      name: module.globalName,
    },
    external: ['react-native', 'react', ...module.externals.map((external) => modules[external].name)],
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        moduleDirectories: ['node_modules'],
      }),
      commonjs({
        ignore: isReactNative ? ['react-native'] : [],
        requireReturnsDefault: 'auto',
        transformMixedEsModules: true,
        exclude: isReactNative ? ['node_modules/react-native/**'] : [],
      }),
      typescript({
        cacheDir: '../../.cache/rollup',
        inlineSources: false,
        outputToFilesystem: true,
        sourceMap: false,
        tsconfig: './tsconfig.esm.json',
        exclude: ['node_modules/**'],
      }),
      terser(),
    ],
  };

  if (isReactNative) {
    baseConfig.onwarn = (warning, warn) => {
      // Suppress certain warnings for React Native
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        return;
      }

      if (warning.code === 'THIS_IS_UNDEFINED') {
        return;
      }

      warn(warning);
    };
  }

  return baseConfig;
};
