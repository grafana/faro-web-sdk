import { Router } from 'express';
import type { Express } from 'express';

import { seedHandler } from './seedHandler';

export function registerApiSeedRoutes(apiRouter: Router, _app: Express): void {
  const seedRouter = Router();

  seedRouter.get('/', seedHandler);

  apiRouter.use('/seed', seedRouter);
}
