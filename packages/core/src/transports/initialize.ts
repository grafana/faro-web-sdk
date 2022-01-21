import type { Config } from '../config';
import type { Transport, Transports } from './types';

export function initializeTransports(config: Config): Transports {
  const value: Transport[] = [...config.transports];

  const add: Transports['add'] = (...transports) => {
    value.push(...transports);
  };

  const execute: Transports['execute'] = (payload) => {
    value.forEach((transport) => transport(payload));
  };

  return {
    add,
    execute,
    value,
  };
}
