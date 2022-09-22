import { Router } from 'express';
import type { Express } from 'express';

import { getMetricsHandler } from './getMetricsHandler';

export function registerMetricsRoutes(globalRouter: Router, _app: Express): void {
  const metricsRouter = Router();

  metricsRouter.get('/', getMetricsHandler);

  globalRouter.use('/metrics', metricsRouter);
}
