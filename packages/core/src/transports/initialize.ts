import type { ExceptionEvent } from '../api';
import type { Config } from '../config';
import type { Patterns } from '../config/types';
import { isString } from '../utils';
import { BeforeSendHook, Transport, TransportItem, TransportItemType, Transports } from './types';

export function initializeTransports(config: Config): Transports {
  const transports: Transport[] = [...config.transports];

  const beforeSendHooks: BeforeSendHook[] = [];
  if (config.beforeSend) {
    beforeSendHooks.push(config.beforeSend);
  }
  if (config.ignoreErrors) {
    beforeSendHooks.push(createBeforeSendHookFromIgnorePatterns(config.ignoreErrors));
  }

  const add: Transports['add'] = (...transports) => {
    transports.push(...transports);
  };

  const execute: Transports['execute'] = (item) => {
    let modified = beforeSendHooks.reduce<TransportItem | null>((prev, hook) => (prev ? hook(prev) : null), item);
    if (modified !== null) {
      for (const transport of transports) {
        transport.send(modified);
      }
    }
  };

  return {
    add,
    execute,
    transports,
  };
}

function createBeforeSendHookFromIgnorePatterns(patterns: Patterns): BeforeSendHook {
  return (item) => {
    if (item.type === TransportItemType.EXCEPTION && item.payload) {
      const event = item.payload as ExceptionEvent;
      const msg = `${event.type}: ${event.value}`;
      if (
        patterns.find((pattern) => {
          return isString(pattern) ? msg.includes(pattern) : !!msg.match(pattern);
        })
      ) {
        return null;
      }
    }
    return item;
  };
}
