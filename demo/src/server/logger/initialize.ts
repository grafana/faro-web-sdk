import { format, transports, createLogger as winstonCreateLogger } from 'winston';
import type { Logger } from 'winston';

import { env, toAbsolutePath } from '../utils';
import { setLogger } from './logger';

export function initializeLogger(): Logger {
  const combinedFormat = format.combine(format.errors({ stack: true }), format.metadata(), format.json());

  const logger = winstonCreateLogger({
    level: 'debug',
    defaultMeta: {
      app: env.serverPackageName,
      version: env.packageVersion,
      component: 'server',
    },
    format: combinedFormat,
    transports: [
      new transports.Console(),
      new transports.File({
        filename: toAbsolutePath(`${env.serverLogsPath}/${env.serverLogsName}`),
      }),
    ],
  });

  console.log = (...args: any[]) => logger.info.apply(logger, args as any);
  console.info = (...args: any[]) => logger.info.call(logger, args as any);
  console.warn = (...args: any[]) => logger.warn.call(logger, args as any);
  console.error = (...args: any[]) => logger.error.call(logger, args as any);
  // eslint-disable-next-line no-console
  console.debug = (...args: any[]) => logger.debug.call(logger, args as any);

  setLogger(logger);

  return logger;
}
