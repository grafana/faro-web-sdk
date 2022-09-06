import { Express, Router } from 'express';

import { tokenMiddleware } from '../middlewares';
import { registerApiRoutes } from './api';
import { registerRenderRoutes } from './render';

export async function registerRoutes(app: Express): Promise<Router> {
  const globalRouter = Router();

  app.use(tokenMiddleware);

  registerApiRoutes(globalRouter, app);

  await registerRenderRoutes(globalRouter, app);

  app.use(globalRouter);

  return globalRouter;
}
