import type { ExceptionEvent } from '../api';
import type { Config, Patterns } from '../config';
import { internalLogger } from '../internalLogger';
import type { InternalLogger } from '../internalLogger';
import { isString } from '../utils';
import { TransportItemType } from './const';
import type { BeforeSendHook, Transport, Transports } from './types';

export function shouldIgnoreEvent(patterns: Patterns, msg: string): boolean {
  return patterns.some((pattern) => {
    return isString(pattern) ? msg.includes(pattern) : !!msg.match(pattern);
  });
}

export function createBeforeSendHookFromIgnorePatterns(patterns: Patterns): BeforeSendHook {
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

export function initializeTransports(_internalLogger: InternalLogger, config: Config): Transports {
  const transports: Transport[] = [...config.transports];

  let paused = config.paused;

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
      let actualItem = item;

      for (const hook of beforeSendHooks) {
        const modified = hook(actualItem);

        if (modified === null) {
          return;
        }

        actualItem = modified;
      }

      for (const transport of transports) {
        internalLogger.debug(`Transporting item using ${transport.name} transport`, actualItem);

        transport.send(actualItem);
      }
    }
  };

  const pause: Transports['pause'] = () => {
    internalLogger.debug('Pausing transports');

    paused = true;
  };

  const unpause: Transports['unpause'] = () => {
    internalLogger.debug('Unpausing transports');

    paused = false;
  };

  return {
    add,
    execute,
    pause,
    transports,
    unpause,
  };
}
