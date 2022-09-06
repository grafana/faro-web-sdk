import type { Express, Router } from 'express';
import { readFileSync } from 'fs';

import { env } from '../../../utils';
import { toAbsolutePath, verifyToken } from '../../utils';
import type { Response } from '../../utils';

export async function registerRenderDevRoutes(globalRouter: Router, _app: Express): Promise<void> {
  const vite = await (
    await import('vite')
  ).createServer({
    root: process.cwd(),
    logLevel: env.dev ? 'info' : 'error',
    server: {
      middlewareMode: true,
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
    appType: 'custom',
  });

  globalRouter.use(vite.middlewares);

  globalRouter.use('*', async (req, res) => {
    try {
      const userPublic = verifyToken((res as Response).locals.token) ?? null;

      const preloadedState = {
        user: {
          data: userPublic ?? null,
        },
      };

      const url = req.originalUrl;

      const indexHtml = readFileSync(toAbsolutePath('index.html'), 'utf-8');
      const template = await vite.transformIndexHtml(url, indexHtml);

      const render = (await vite.ssrLoadModule('./src/server/routes/render/renderToString'))['renderToString'];

      const [renderedHtml, helmetContext] = render(url, preloadedState);

      const html = template
        .replace('<!--app-title-->', helmetContext.helmet.title.toString())
        .replace('<!--app-state-->', `<script>window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState)}</script>`)
        .replace('<!--app-html-->', renderedHtml);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (err) {
      vite.ssrFixStacktrace(err);

      console.log(err.stack);

      res.status(500).end(err.stack);
    }
  });
}
