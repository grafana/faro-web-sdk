import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Express } from 'express';

import { registerRoutes } from './routes';
import { env } from './utils';

export async function createServer(): Promise<Express> {
  const app = express();

  if (env.mode.prod) {
    app.use((await import('compression')).default());
  }

  app.use(bodyParser.json());
  app.use(cookieParser());

  await registerRoutes(app);

  return app;
}
