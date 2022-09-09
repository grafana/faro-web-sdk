import { format, transports, createLogger as winstonCreateLogger } from 'winston';

import { packageVersion, serverPackageName } from '../common';
import { toAbsolutePath } from './utils';

export const logger = winstonCreateLogger({
  level: 'debug',
  defaultMeta: {
    app: serverPackageName,
    version: packageVersion,
    component: 'api',
  },
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({
      filename: toAbsolutePath('logs/server.log'),
      format: format.json(),
    }),
  ],
});

// @ts-ignore
console.log = (...args: any[]) => logger.info.call(logger, ...args);
// @ts-ignore
console.info = (...args: any[]) => logger.info.call(logger, ...args);
// @ts-ignore
console.warn = (...args: any[]) => logger.warn.call(logger, ...args);
// @ts-ignore
console.error = (...args: any[]) => logger.error.call(logger, ...args);
// @ts-ignore
// eslint-disable-next-line no-console
console.debug = (...args: any[]) => logger.debug.call(logger, ...args);
