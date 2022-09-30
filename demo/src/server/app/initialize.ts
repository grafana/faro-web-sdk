import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Express } from 'express';

import { logger } from '../logger';
import { registerRoutes } from '../routes';
import { env } from '../utils';

export async function initializeApp(): Promise<Express> {
  const app = express();

  if (env.mode.prod) {
    app.use((await import('compression')).default());
  }

  app.use(bodyParser.json());
  app.use(cookieParser());

  await registerRoutes(app);

  if (!env.mode.test) {
    try {
      await app.listen(Number(env.server.port), '0.0.0.0');

      logger.info(`App is running at: http://localhost:${env.server.port}`);
      logger.info(`Grafana is running at: http://localhost:${env.grafana.port}`);
    } catch (err) {
      logger.error(err);
    }
  }

  return app;
}
