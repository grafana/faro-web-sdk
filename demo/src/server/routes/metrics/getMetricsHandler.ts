import { register } from 'prom-client';

import type { RequestHandler } from '../../utils';

export const getMetricsHandler: RequestHandler<{}, any, any, {}> = async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
};
