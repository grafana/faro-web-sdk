/**
 * Reads the export surface of every package on the two paths a browser can see.
 *
 * The ES module surface is collected by importing each package **by name**, so Vite resolves it the
 * same way a customer's bundler does: through the `module` field, into `dist/esm`. The bundle surface
 * is collected by loading each `iife.js` and reading its global.
 *
 * Both results land on `window`, where the export snapshot spec picks them up.
 */
import { type ExportShape, PUBLISHED_PACKAGES, readShape } from './packages';

/**
 * Imported one at a time rather than with static imports at the top.
 *
 * A static import would make this page part of one module graph with all six packages, so a single
 * package that cannot link takes the whole page down and the spec sees nothing but a timeout. That is
 * not hypothetical: removing an export that another package imports does exactly that. Importing each
 * package on its own lets the others still be measured, and turns the failure into a named error.
 *
 * The specifiers stay literal so Vite can still resolve them.
 */
const ESM_IMPORTS: Record<string, () => Promise<object>> = {
  '@grafana/faro-core': () => import('@grafana/faro-core'),
  '@grafana/faro-web-sdk': () => import('@grafana/faro-web-sdk'),
  '@grafana/faro-web-tracing': () => import('@grafana/faro-web-tracing'),
  '@grafana/faro-react': () => import('@grafana/faro-react'),
  '@grafana/faro-instrumentation-replay': () => import('@grafana/faro-instrumentation-replay'),
  '@grafana/faro-transport-otlp-http': () => import('@grafana/faro-transport-otlp-http'),
};

declare global {
  interface Window {
    __esmSurface?: Record<string, ExportShape | null>;
    __esmErrors?: Record<string, string>;
    __iifeSurface?: Record<string, ExportShape | null>;
    __iifeErrors?: Record<string, string>;
    __surfaceReady?: boolean;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function collect(): Promise<void> {
  const esm: Record<string, ExportShape | null> = {};
  const esmErrors: Record<string, string> = {};

  for (const [name, load] of Object.entries(ESM_IMPORTS)) {
    try {
      esm[name] = readShape(await load());
    } catch (error) {
      esm[name] = null;
      esmErrors[name] = error instanceof Error ? error.message : String(error);
    }
  }

  window.__esmSurface = esm;
  window.__esmErrors = esmErrors;

  // React 19 ships no UMD build, so the react bundle needs a React global. Handing it the real React
  // that Vite already resolved is better than a stub: the bundle gets the same object a content
  // delivery network user would provide with a script tag.
  const [react, reactDom] = await Promise.all([import('react'), import('react-dom')]);
  (window as unknown as Record<string, unknown>)['React'] = react;
  (window as unknown as Record<string, unknown>)['ReactDOM'] = reactDom;

  const iife: Record<string, ExportShape | null> = {};
  const errors: Record<string, string> = {};
  const loaded = new Set<string>();

  for (const pkg of PUBLISHED_PACKAGES) {
    try {
      for (const dependency of pkg.needs) {
        if (!loaded.has(dependency)) {
          await loadScript(`/bundles/${dependency}.iife.js`);
          loaded.add(dependency);
        }
      }

      if (!loaded.has(pkg.bundle)) {
        await loadScript(`/bundles/${pkg.bundle}.iife.js`);
        loaded.add(pkg.bundle);
      }

      const namespace = (window as unknown as Record<string, object | undefined>)[pkg.global];
      iife[pkg.name] = namespace ? readShape(namespace) : null;

      if (!namespace) {
        errors[pkg.name] = `the bundle loaded but did not define ${pkg.global}`;
      }
    } catch (error) {
      iife[pkg.name] = null;
      errors[pkg.name] = error instanceof Error ? error.message : String(error);
    }
  }

  window.__iifeSurface = iife;
  window.__iifeErrors = errors;
  window.__surfaceReady = true;

  const output = document.getElementById('out');
  if (output) {
    const esmTotal = Object.values(esm).reduce((sum, shape) => sum + Object.keys(shape ?? {}).length, 0);
    const iifeTotal = Object.values(iife).reduce((sum, shape) => sum + Object.keys(shape ?? {}).length, 0);
    const failed = [...Object.keys(esmErrors), ...Object.keys(errors)];
    output.textContent =
      `ES modules: ${esmTotal} exports across ${Object.keys(esm).length} packages. ` +
      `Bundles: ${iifeTotal} exports. ` +
      (failed.length
        ? `Bundles that failed to expose a global: ${failed.join(', ')}`
        : 'All bundles exposed a global.');
  }
}

void collect();
