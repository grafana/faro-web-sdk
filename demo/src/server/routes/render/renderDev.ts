import type { Express, Router } from 'express';
import { readFileSync } from 'fs';

import { env } from '../../../common';
import { logger } from '../../logger';
import { sendError, toAbsolutePath } from '../../utils';
import type { Request, Response } from '../../utils';
import { renderPage } from './renderPage';

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
      const indexHtml = readFileSync(toAbsolutePath('index.html'), 'utf-8');
      const template = await vite.transformIndexHtml(req.originalUrl, indexHtml);

      const render = (await vite.ssrLoadModule('./src/server/routes/render/renderToString'))['renderToString'];

      renderPage(req as Request, res as Response, template, render);
    } catch (err) {
      logger.error(err);

      vite.ssrFixStacktrace(err);

      sendError(res, err);
    }
  });
}
