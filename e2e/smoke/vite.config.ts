import react from '@vitejs/plugin-react-swc';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const REPO_ROOT = resolve(import.meta.dirname, '../..');

// Where a bundle can live. Searched rather than imported from src/packages.ts so the Vite config stays
// free of project imports, which its native config loader does not resolve.
const BUNDLE_DIRECTORIES = ['packages', 'experimental'];

/**
 * Serve the real built bundles at a stable URL, and answer the collector.
 *
 * The bundles are served rather than copied so there is one source of truth: the pages load exactly
 * the file that gets published. The collector responder only matters when a person opens a page by
 * hand, because Playwright intercepts `/collect` itself. Without it, Faro's transport would retry
 * against a 404 and the interesting output would be buried in failed requests.
 */
function faroHarnessPlugin(): Plugin {
  return {
    name: 'faro-harness',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';

        const bundleMatch = /^\/bundles\/([\w-]+)\.iife\.js$/.exec(url);
        if (bundleMatch) {
          const requested = bundleMatch[1];
          const file = BUNDLE_DIRECTORIES.flatMap((group) => {
            const groupRoot = join(REPO_ROOT, group);
            if (!existsSync(groupRoot)) {
              return [];
            }
            return readdirSync(groupRoot).map((entry) => join(groupRoot, entry, 'dist/bundle', `${requested}.iife.js`));
          }).find((candidate) => existsSync(candidate));

          if (!file) {
            res.statusCode = 404;
            res.end(`No built bundle for "${requested}". Run "yarn build" from the repository root.`);
            return;
          }

          res.setHeader('content-type', 'text/javascript');
          res.end(readFileSync(file));
          return;
        }

        if (url === '/collect' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk as Buffer));
          req.on('end', () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString());
              const kinds = Object.keys(body).filter((key) => key !== 'meta');
              server.config.logger.info(`collect: ${kinds.join(', ') || 'empty'}`);
            } catch {
              server.config.logger.info('collect: unparseable body');
            }
            res.statusCode = 201;
            res.end('{}');
          });
          return;
        }

        next();
      });
    },
  };
}

interface NavigationReproRun {
  payloads: Array<{ receivedAtMs: number; body: unknown }>;
  released: boolean;
  releaseLanding?: () => void;
}

/**
 * Server side of the navigation telemetry loss reproduction (navigation-loss.html).
 *
 * Payloads are recorded where they arrive, so the spec sees what a real collector would receive,
 * including requests sent while the page unloads. The landing page can be held until a release
 * request, which decides when the old page unloads without a sleep. A release may arrive before the
 * held request does. Each run has its own id; `/collect/<id>` still matches Faro's default collector
 * ignore pattern, so the transport's own requests are not traced.
 */
function navigationReproPlugin(): Plugin {
  const runs = new Map<string, NavigationReproRun>();
  const getRun = (id: string) => {
    let run = runs.get(id);
    if (!run) {
      run = { payloads: [], released: false };
      runs.set(id, run);
    }
    return run;
  };

  return {
    name: 'faro-navigation-repro',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [path = '', query = ''] = (req.url ?? '').split('?');
        const route = /^\/(collect|__repro\/fail|__repro\/landed|__repro\/release|__repro\/collected)\/(\w+)$/.exec(
          path
        );
        if (!route) {
          next();
          return;
        }

        const [, action, id] = route;
        const run = getRun(id!);
        res.setHeader('cache-control', 'no-store');

        if (action === 'collect' && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk as Buffer));
          req.on('end', () => {
            let body: unknown;
            try {
              body = JSON.parse(Buffer.concat(chunks).toString());
            } catch {
              body = { unparseable: true };
            }
            run.payloads.push({ receivedAtMs: Date.now(), body });
            res.statusCode = 201;
            res.end('{}');
          });
          return;
        }

        if (action === '__repro/fail') {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end('{"error":"repro"}');
          return;
        }

        if (action === '__repro/landed') {
          const respond = () => {
            run.releaseLanding = undefined;
            res.setHeader('content-type', 'text/html');
            res.end('<!doctype html><title>landed</title><p>landed</p>');
          };
          if (new URLSearchParams(query).get('hold') === '1' && !run.released) {
            // The timeout only stops a failed spec leaving a request open.
            const safety = setTimeout(respond, 15_000);
            run.releaseLanding = () => {
              clearTimeout(safety);
              respond();
            };
          } else {
            respond();
          }
          return;
        }

        if (action === '__repro/release' && req.method === 'POST') {
          run.released = true;
          res.statusCode = 204;
          res.end();
          run.releaseLanding?.();
          return;
        }

        if (action === '__repro/collected') {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(run.payloads));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), faroHarnessPlugin(), navigationReproPlugin()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5174,
    strictPort: true,
  },
});
