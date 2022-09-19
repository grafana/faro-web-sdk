import { config } from 'dotenv';
import { resolve } from 'path';

import { getEnvConfig } from '../../common';

config({
  path: resolve(process.cwd(), '../.env'),
});

config({
  path: resolve(process.cwd(), '../.env.local'),
  override: true,
});

export const env = getEnvConfig(process.env, process.env['NODE_ENV']);

process.env['__APP_ENV__'] = JSON.stringify(env);
