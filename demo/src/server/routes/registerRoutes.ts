import { Express, Router } from 'express';

import { tokenMiddleware } from '../middlewares';
import { registerApiRoutes } from './api';
import { registerMetricsRoutes } from './metrics';
import { registerRenderRoutes } from './render';

export async function registerRoutes(app: Express): Promise<Router> {
  const globalRouter = Router();

  app.use(tokenMiddleware);

  registerApiRoutes(globalRouter, app);

  registerMetricsRoutes(globalRouter, app);

  await registerRenderRoutes(globalRouter, app);

  app.use(globalRouter);

  return globalRouter;
}
