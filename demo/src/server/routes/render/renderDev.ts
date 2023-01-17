import type { Express, Router } from 'express';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

import { logger } from '../../logger';
import { env, sendError, toAbsolutePath } from '../../utils';
import type { Request, Response } from '../../utils';

import { renderPage } from './renderPage';

export async function registerRenderDevRoutes(globalRouter: Router, _app: Express): Promise<void> {
  const vite = await createServer({
    root: process.cwd(),
    logLevel: env.mode.dev ? 'info' : 'error',
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

  globalRouter.use('*', async (req: Request, res: Response) => {
    try {
      const indexHtml = readFileSync(toAbsolutePath('index.html'), 'utf-8');
      const template = await vite.transformIndexHtml(req.originalUrl, indexHtml);

      const render = (await vite.ssrLoadModule('./src/server/routes/render/renderToString'))['renderToString'];

      await renderPage(req, res, template, render);
    } catch (err) {
      logger.error(err);

      vite.ssrFixStacktrace(err);

      sendError(res, err);
    }
  });
}
