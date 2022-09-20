import 'isomorphic-fetch';

import './otel/initialize';

import { initializeApp } from './app';
import { initializeLogger } from './logger';
import { initializeMetrics } from './metrics';

initializeLogger();

initializeMetrics();

initializeApp();
