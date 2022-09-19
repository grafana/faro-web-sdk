import { config } from 'dotenv';
import { resolve } from 'path';

import { getEnvConfig } from '../../common';

const { parsed: vars } = config({
  path: resolve(process.cwd(), '../.env'),
});

export const env = getEnvConfig(vars!, process.env['NODE_ENV']);

process.env['__APP_ENV__'] = JSON.stringify(env);
