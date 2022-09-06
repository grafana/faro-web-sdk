import { Router } from 'express';
import type { Express } from 'express';

import { registerApiArticlesRoutes } from './articles';
import { registerApiAuthRoutes } from './auth';

export function registerApiRoutes(globalRouter: Router, app: Express): void {
  const apiRouter = Router();

  registerApiAuthRoutes(apiRouter, app);
  registerApiArticlesRoutes(apiRouter, app);

  globalRouter.use('/api', apiRouter);
}
