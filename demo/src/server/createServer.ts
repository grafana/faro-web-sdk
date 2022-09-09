import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Express } from 'express';

import { env } from '../common';
import { registerRoutes } from './routes';

export async function createServer(): Promise<Express> {
  const app = express();

  if (env.prod) {
    app.use((await import('compression')).default());
  }

  app.use(bodyParser.json());
  app.use(cookieParser());

  await registerRoutes(app);

  return app;
}
