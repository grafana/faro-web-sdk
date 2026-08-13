/**
 * Reads the export surface of every package on the two paths a browser can see.
 *
 * The ES module surface is collected by importing each package **by name**, so Vite resolves it the
 * same way a customer's bundler does: through the `module` field, into `dist/esm`. The bundle surface
 * is collected by loading each `iife.js` and reading its global.
 *
 * Both results land on `window`, where the export snapshot spec picks them up.
 */
import * as faroCore from '@grafana/faro-core';
import * as faroInstrumentationReplay from '@grafana/faro-instrumentation-replay';
import * as faroReact from '@grafana/faro-react';
import * as faroTransportOtlpHttp from '@grafana/faro-transport-otlp-http';
import * as faroWebSdk from '@grafana/faro-web-sdk';
import * as faroWebTracing from '@grafana/faro-web-tracing';

import { type ExportShape, PUBLISHED_PACKAGES, readShape } from './packages';

const ESM_NAMESPACES: Record<string, object> = {
  '@grafana/faro-core': faroCore,
  '@grafana/faro-web-sdk': faroWebSdk,
  '@grafana/faro-web-tracing': faroWebTracing,
  '@grafana/faro-react': faroReact,
  '@grafana/faro-instrumentation-replay': faroInstrumentationReplay,
  '@grafana/faro-transport-otlp-http': faroTransportOtlpHttp,
};

declare global {
  interface Window {
    __esmSurface?: Record<string, ExportShape>;
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
  const esm: Record<string, ExportShape> = {};
  for (const [name, namespace] of Object.entries(ESM_NAMESPACES)) {
    esm[name] = readShape(namespace);
  }
  window.__esmSurface = esm;

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
    const esmTotal = Object.values(esm).reduce((sum, shape) => sum + Object.keys(shape).length, 0);
    const iifeTotal = Object.values(iife).reduce((sum, shape) => sum + Object.keys(shape ?? {}).length, 0);
    const failed = Object.keys(errors);
    output.textContent =
      `ES modules: ${esmTotal} exports across ${Object.keys(esm).length} packages. ` +
      `Bundles: ${iifeTotal} exports. ` +
      (failed.length
        ? `Bundles that failed to expose a global: ${failed.join(', ')}`
        : 'All bundles exposed a global.');
  }
}

void collect();
