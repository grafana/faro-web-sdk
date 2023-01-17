import type { ExceptionEvent } from '../api';
import type { Config, Patterns } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { UnpatchedConsole } from '../unpatchedConsole';
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
      const evt = item.payload as ExceptionEvent;
      const msg = `${evt.type}: ${evt.value}`;

      if (shouldIgnoreEvent(patterns, msg)) {
        return null;
      }
    }

    return item;
  };
}

export function initializeTransports(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas
): Transports {
  internalLogger.debug('Initializing transports');

  const transports: Transport[] = [];

  let paused = config.paused;

  let beforeSendHooks: BeforeSendHook[] = [];

  const add: Transports['add'] = (...newTransports) => {
    internalLogger.debug('Adding transports');

    newTransports.forEach((newTransport) => {
      internalLogger.debug(`Adding "${newTransport.name}" transport`);

      const exists = transports.some((existingTransport) => existingTransport === newTransport);

      if (exists) {
        internalLogger.warn(`Transport ${newTransport.name} is already added`);

        return;
      }

      newTransport.unpatchedConsole = unpatchedConsole;
      newTransport.internalLogger = internalLogger;
      newTransport.config = config;
      newTransport.metas = metas;

      transports.push(newTransport);
    });
  };

  const addBeforeSendHooks: Transports['addBeforeSendHooks'] = (...newBeforeSendHooks) => {
    internalLogger.debug('Adding beforeSendHooks\n', beforeSendHooks);

    newBeforeSendHooks.forEach((beforeSendHook) => {
      if (beforeSendHook) {
        beforeSendHooks.push(beforeSendHook);
      }
    });
  };

  const addIgnoreErrorsPatterns: Transports['addIgnoreErrorsPatterns'] = (...ignoreErrorsPatterns) => {
    internalLogger.debug('Adding ignoreErrorsPatterns\n', ignoreErrorsPatterns);

    ignoreErrorsPatterns.forEach((ignoreErrorsPattern) => {
      if (ignoreErrorsPattern) {
        beforeSendHooks.push(createBeforeSendHookFromIgnorePatterns(ignoreErrorsPattern));
      }
    });
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
        internalLogger.debug(`Transporting item using ${transport.name}\n`, actualItem);

        transport.send(actualItem);
      }
    }
  };

  const getBeforeSendHooks: Transports['getBeforeSendHooks'] = () => [...beforeSendHooks];

  const isPaused: Transports['isPaused'] = () => paused;

  const pause: Transports['pause'] = () => {
    internalLogger.debug('Pausing transports');

    paused = true;
  };

  const remove: Transports['remove'] = (...transportsToRemove) => {
    internalLogger.debug('Removing transports');

    transportsToRemove.forEach((transportToRemove) => {
      internalLogger.debug(`Removing "${transportToRemove.name}" transport`);

      const existingTransportIndex = transports.indexOf(transportToRemove);

      if (existingTransportIndex === -1) {
        internalLogger.warn(`Transport "${transportToRemove.name}" is not added`);

        return;
      }

      transports.splice(existingTransportIndex, 1);
    });
  };

  const removeBeforeSendHooks: Transports['removeBeforeSendHooks'] = (...beforeSendHooksToRemove) => {
    beforeSendHooks.filter((beforeSendHook) => !beforeSendHooksToRemove.includes(beforeSendHook));
  };

  const unpause: Transports['unpause'] = () => {
    internalLogger.debug('Unpausing transports');

    paused = false;
  };

  return {
    add,
    addBeforeSendHooks,
    addIgnoreErrorsPatterns,
    getBeforeSendHooks,
    execute,
    isPaused,
    pause,
    remove,
    removeBeforeSendHooks,
    get transports() {
      return [...transports];
    },
    unpause,
  };
}
