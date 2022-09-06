import type { Express, Router } from 'express';
import { readFileSync } from 'fs';

import { toAbsolutePath, verifyToken } from '../../utils';
import type { Response } from '../../utils';
import type { renderToString } from './renderToString';

export async function registerRenderProdRoutes(globalRouter: Router, _app: Express): Promise<void> {
  globalRouter.use(
    (await import('serve-static')).default(toAbsolutePath('dist/client'), {
      index: false,
    })
  );

  globalRouter.use('*', async (req, res) => {
    try {
      const userPublic = verifyToken((res as Response).locals.token) ?? null;

      const preloadedState = {
        user: {
          data: userPublic ?? null,
        },
      };

      const url = req.originalUrl;

      const template = readFileSync(toAbsolutePath('dist/client/index.html'), 'utf-8');

      // @ts-ignore: Ignoring due to missing types
      const render: typeof renderToString = (await import('./renderToString'))['renderToString'];

      const [renderedHtml, helmetContext] = render(url, preloadedState);

      const html = template
        .replace('<!--app-title-->', helmetContext.helmet.title.toString())
        .replace('<!--app-state-->', `<script>window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState)}</script>`)
        .replace(`<!--app-html-->`, renderedHtml);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      console.log(e.stack);

      res.status(500).end(e.stack);
    }
  });
}
