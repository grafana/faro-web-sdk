import type { ExceptionEvent } from '../api';
import type { Config } from '../config';
import type { Patterns } from '../config/types';
import { isString } from '../utils';
import { BeforeSendHook, Transport, TransportItemType, Transports } from './types';

export function initializeTransports(config: Config): Transports {
  const transports: Transport[] = [...config.transports];

  let paused = config.paused ?? false;

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
    if (!paused) {
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
    }
  };

  const pause = () => {
    paused = true;
  };

  const unpause = () => {
    paused = false;
  };

  return {
    add,
    execute,
    transports,
    pause,
    unpause,
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
