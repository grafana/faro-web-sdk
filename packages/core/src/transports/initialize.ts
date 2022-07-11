import type { ExceptionEvent } from '../api';
import type { Config, Patterns } from '../config';
import { isString } from '../utils';
import { BeforeSendHook, Transport, TransportItemType, Transports } from './types';

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
    let _item = item;

    for (const hook of beforeSendHooks) {
      const modified = hook(_item);

      if (modified === null) {
        return;
      }

      _item = modified;
    }

    for (const transport of transports) {
      transport.send(_item);
    }
  };

  return {
    add,
    execute,
    transports,
  };
}

function shouldIgnoreEvent(patterns: Patterns, msg: string): boolean {
  return patterns.some((pattern) => {
    return isString(pattern) ? msg.includes(pattern) : !!msg.match(pattern);
  });
}

function createBeforeSendHookFromIgnorePatterns(patterns: Patterns): BeforeSendHook {
  return (item) => {
    if (item.type === TransportItemType.EXCEPTION && item.payload) {
      const event = item.payload as ExceptionEvent;
      const msg = `${event.type}: ${event.value}`;

      if (shouldIgnoreEvent(patterns, msg)) {
        return null;
      }
    }

    return item;
  };
}
