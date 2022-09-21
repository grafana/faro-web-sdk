import type { Express, Router } from 'express';
import { readFileSync } from 'fs';

import { logger } from '../../logger';
import { sendError, toAbsolutePath } from '../../utils';
import type { Request, Response } from '../../utils';
import { renderPage } from './renderPage';

export async function registerRenderProdRoutes(globalRouter: Router, _app: Express): Promise<void> {
  globalRouter.use(
    (await import('serve-static')).default(toAbsolutePath('dist/client'), {
      index: false,
    })
  );

  globalRouter.use('*', async (req, res) => {
    try {
      const template = readFileSync(toAbsolutePath('dist/client/index.html'), 'utf-8');

      const render = (await import('./renderToString'))['renderToString'];

      await renderPage(req as Request, res as Response, template, render);
    } catch (err) {
      logger.error(err);

      sendError(res, err);
    }
  });
}
