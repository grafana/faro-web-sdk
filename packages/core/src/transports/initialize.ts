import type { Config } from '../config';
import type { Transport, Transports } from './types';

export function initializeTransports(config: Config): Transports {
  const transports: Transport[] = [...config.transports];

  const add: Transports['add'] = (...transports) => {
    transports.push(...transports);
  };

  const execute: Transports['execute'] = (payload) => {
    transports.forEach((transport) => transport.send(payload));
  };

  return {
    add,
    execute,
    value: transports,
  };
}
