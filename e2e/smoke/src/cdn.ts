/**
 * Runs the core journeys against the published bundles, loaded with script tags.
 *
 * This is the path a customer takes when they paste a unpkg script tag into a page, and it is the one
 * nothing else covers. It is also the path where `faro-react.iife.js` was broken: the bundle contained
 * `process.env.NODE_ENV`, which does not exist in a browser, so it threw before defining its global.
 * A bundler test cannot see that, because a bundler substitutes the value.
 */
import { assert, type Check, runChecks, waitFor } from './checks';
import { PUBLISHED_PACKAGES } from './packages';

/** Record what the transports actually send. */
const sent: Array<Record<string, unknown>> = [];
const nativeFetch = window.fetch.bind(window);

window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  if (url.includes('/collect') && init?.body) {
    try {
      sent.push(JSON.parse(String(init.body)));
    } catch {
      // Not interesting here.
    }
  }

  return nativeFetch(input as RequestInfo, init);
};

const sentIncludes = (needle: string) => sent.some((body) => JSON.stringify(body).includes(needle));

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`the browser refused to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Loading a bundle can fail in two different ways, and only one of them is an `onerror`. A bundle that
 * downloads fine but throws while evaluating reports through `window.onerror` instead, and that is
 * exactly how the react bundle failed. Watch for both.
 */
async function loadBundle(name: string): Promise<void> {
  const failures: string[] = [];
  const onError = (event: ErrorEvent) => failures.push(event.message);
  window.addEventListener('error', onError);

  try {
    await loadScript(`/bundles/${name}.iife.js`);
    // Give a synchronous throw during evaluation a chance to surface.
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (failures.length) {
      throw new Error(`${name}.iife.js threw while evaluating: ${failures[0]}`);
    }
  } finally {
    window.removeEventListener('error', onError);
  }
}

const globalOf = (name: string): Record<string, unknown> | undefined =>
  (window as unknown as Record<string, Record<string, unknown> | undefined>)[name];

// React 19 ships no UMD build, so a content delivery network user has to provide a React global. Give
// the react bundle the real React rather than a stub, so the check means something.
const [react, reactDom] = await Promise.all([import('react'), import('react-dom')]);
(window as unknown as Record<string, unknown>)['React'] = react;
(window as unknown as Record<string, unknown>)['ReactDOM'] = reactDom;

const checks: Check[] = [
  ...PUBLISHED_PACKAGES.map((pkg) => ({
    name: `${pkg.bundle}.iife.js loads and defines ${pkg.global}`,
    run: async () => {
      for (const dependency of pkg.needs) {
        await loadBundle(dependency);
      }
      await loadBundle(pkg.bundle);

      const namespace = globalOf(pkg.global);
      assert(namespace, `the bundle loaded but ${pkg.global} is not defined`);
      assert(Object.keys(namespace ?? {}).length > 0, `${pkg.global} is defined but exports nothing`);
    },
  })),
  {
    name: 'initializeFaro works from the web-sdk global',
    run: () => {
      const webSdk = globalOf('GrafanaFaroWebSdk');
      assert(webSdk, 'GrafanaFaroWebSdk is not defined');

      const initializeFaro = webSdk?.['initializeFaro'] as (config: unknown) => Record<string, unknown>;
      const getWebInstrumentations = webSdk?.['getWebInstrumentations'] as () => unknown[];
      const TracingInstrumentation = globalOf('GrafanaFaroWebTracing')?.['TracingInstrumentation'] as new () => unknown;

      const faro = initializeFaro({
        url: '/collect',
        app: { name: 'faro-cdn-page', version: '0.0.0', environment: 'test' },
        instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
      });

      assert(typeof faro['api'] === 'object', 'the initialized instance has no api');
      (window as unknown as Record<string, unknown>)['__cdnFaro'] = faro;
    },
  },
  {
    name: 'pushLog from the global reaches the collector',
    run: async () => {
      const faro = (window as unknown as Record<string, Record<string, Record<string, unknown>>>)['__cdnFaro'];
      const pushLog = faro?.['api']?.['pushLog'] as (args: unknown[]) => void;
      pushLog(['cdn page log']);
      await waitFor(() => sentIncludes('cdn page log'), 'a log payload from the bundle');
    },
  },
  {
    name: 'tracing from the global exports a span',
    run: async () => {
      const faro = (window as unknown as Record<string, Record<string, Record<string, unknown>>>)['__cdnFaro'];
      const getOTEL = faro?.['api']?.['getOTEL'] as () => { trace: { getTracer: (n: string) => any } } | undefined;
      const otel = getOTEL();
      assert(otel, 'getOTEL returned nothing, so the tracing bundle did not initialize');
      const span = otel!.trace.getTracer('cdn-page').startSpan('cdn-page-span');
      span.end();
      await waitFor(() => sentIncludes('cdn-page-span'), 'a trace payload from the bundle');
    },
  },
  {
    name: 'the react global exposes its components and re-exports the web-sdk API',
    run: () => {
      const reactBundle = globalOf('GrafanaFaroReact');
      assert(reactBundle, 'GrafanaFaroReact is not defined');

      for (const expected of ['ReactIntegration', 'FaroErrorBoundary', 'withFaroErrorBoundary', 'FaroRoutes']) {
        assert(expected in (reactBundle ?? {}), `${expected} is missing from the react bundle`);
      }
      // The react bundle re-exports the web-sdk surface, reading it off the global at run time.
      assert('initializeFaro' in (reactBundle ?? {}), 'the react bundle does not re-export initializeFaro');
      assert(
        (reactBundle?.['reactVersion'] as string | undefined) === react.version,
        'the react bundle did not pick up the React global'
      );
    },
  },
];

const root = document.getElementById('root');
if (root) {
  void runChecks(checks, root);
}
