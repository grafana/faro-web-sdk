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

export default defineConfig({
  plugins: [react(), faroHarnessPlugin()],
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
