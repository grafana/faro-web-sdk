import { Express, Router } from 'express';

import { serverTimingMiddleware, tokenMiddleware, traceparentMiddleware } from '../middlewares';

import { registerApiRoutes } from './api';
import { registerMetricsRoutes } from './metrics';
import { registerRenderRoutes } from './render';

export async function registerRoutes(app: Express): Promise<Router> {
  const globalRouter = Router();

  app.use(serverTimingMiddleware);

  app.use(tokenMiddleware);

  app.use(traceparentMiddleware);

  globalRouter.get('/long-running-request', (req, res) => {
    const delay = Number(req.query['delay'] ?? 0);

    setTimeout(() => {
      res.send(`Long Running Request with delay: ${delay}`);
    }, delay);
  });

  registerApiRoutes(globalRouter, app);

  registerMetricsRoutes(globalRouter, app);

  await registerRenderRoutes(globalRouter, app);

  app.use(globalRouter);

  return globalRouter;
}
