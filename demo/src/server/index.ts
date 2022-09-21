import 'isomorphic-fetch';

import './otel/initialize';

import { initializeApp } from './app';
import { initializeDb } from './db';
import { initializeLogger } from './logger';
import { initializeMetrics } from './metrics';

initializeLogger();

initializeMetrics();

initializeDb().then(async () => {
  await initializeApp();
});
