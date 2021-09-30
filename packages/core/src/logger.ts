import { config } from './config';
import { Logger } from './types';

/* eslint-disable no-console */

export const logger: Logger = {
  sendEvent: (...args) => {
    console.group();
    console.debug(`Receiver URL: ${config.receiverUrl}`);
    console.debug(...args);
    console.groupEnd();
  },
};
