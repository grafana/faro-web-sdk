import { config } from 'dotenv';
import { resolve } from 'node:path';

import { getEnvConfig, getPublicEnvConfig } from '../../common';

config({
  path: resolve(process.cwd(), '../.env'),
});

config({
  path: resolve(process.cwd(), '../.env.local'),
  override: true,
});

if (process.env['IS_TEST']) {
  config({
    path: resolve(process.cwd(), '../.env.test'),
    override: true,
  });
}

export const env = getEnvConfig(process.env, process.env['NODE_ENV']);

process.env['__APP_ENV__'] = JSON.stringify(getPublicEnvConfig(env));
