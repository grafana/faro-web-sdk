/**
 * The six published packages, described once.
 *
 * Everything that walks the public surface reads this list: the export snapshot specs, the bundler
 * playground, and the content delivery network page. Adding a package later is one entry here.
 */
export interface PublishedPackage {
  /** npm name, and the specifier a consumer imports. */
  name: string;
  /** Path from the repository root, used to reach the built output. */
  dir: string;
  /** File name of the bundle, without the `.iife.js` suffix. */
  bundle: string;
  /** Global variable the bundle assigns itself to. */
  global: string;
  /**
   * Bundles that must already be loaded when this one evaluates, because it reads them off globals
   * rather than carrying them. Order matters.
   */
  needs: string[];
}

export const PUBLISHED_PACKAGES: PublishedPackage[] = [
  {
    name: '@grafana/faro-core',
    dir: 'packages/core',
    bundle: 'faro-core',
    global: 'GrafanaFaroCore',
    needs: [],
  },
  {
    name: '@grafana/faro-web-sdk',
    dir: 'packages/web-sdk',
    bundle: 'faro-web-sdk',
    global: 'GrafanaFaroWebSdk',
    needs: [],
  },
  {
    name: '@grafana/faro-web-tracing',
    dir: 'packages/web-tracing',
    bundle: 'faro-web-tracing',
    global: 'GrafanaFaroWebTracing',
    needs: ['faro-web-sdk'],
  },
  {
    name: '@grafana/faro-react',
    dir: 'packages/react',
    bundle: 'faro-react',
    global: 'GrafanaFaroReact',
    needs: ['faro-web-sdk'],
  },
  {
    name: '@grafana/faro-instrumentation-replay',
    dir: 'experimental/instrumentation-replay',
    bundle: 'faro-instrumentation-replay',
    global: 'GrafanaFaroInstrumentationReplay',
    needs: [],
  },
  {
    name: '@grafana/faro-transport-otlp-http',
    dir: 'experimental/transport-otlp-http',
    bundle: 'faro-transport-otlp-http',
    global: 'GrafanaFaroTransportOtlpHttp',
    needs: [],
  },
];

/** Export name to `typeof`, for one package on one consumption path. */
export type ExportShape = Record<string, string>;

/** Every package on every path: `surface[packageName][path]`. */
export type ExportSurface = Record<string, Record<'cjs' | 'esm' | 'iife', ExportShape>>;

/** Read the export names and runtime types off a namespace object or a global. */
export function readShape(namespace: object): ExportShape {
  const shape: ExportShape = {};

  for (const key of Object.keys(namespace).sort()) {
    if (key === '__esModule') {
      continue;
    }
    shape[key] = typeof (namespace as Record<string, unknown>)[key];
  }

  return shape;
}
