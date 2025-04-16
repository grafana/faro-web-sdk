import type { APIEvent, ExceptionEvent } from '../api';
import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { UnpatchedConsole } from '../unpatchedConsole';

import { BatchExecutor } from './batchExecutor';
import { TransportItemType } from './const';
import type { BeforeSendHook, Transport, TransportItem, Transports } from './types';

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

  const applyBeforeSendHooks = (items: TransportItem[]): TransportItem[] => {
    let filteredItems = items;
    for (const hook of beforeSendHooks) {
      const modified = filteredItems.map(hook).filter(Boolean) as TransportItem[];

      if (modified.length === 0) {
        return [];
      }

      filteredItems = sanitizeItems(modified, config);
    }
    return filteredItems;
  };

  const batchedSend = (items: TransportItem[]) => {
    const filteredItems = applyBeforeSendHooks(items);

    if (filteredItems.length === 0) {
      return;
    }

    for (const transport of transports) {
      internalLogger.debug(`Transporting item using ${transport.name}\n`, filteredItems);
      if (transport.isBatched()) {
        transport.send(filteredItems);
      }
    }
  };

  const instantSend = (item: TransportItem) => {
    // prevent all beforeSend hooks being executed twice if batching is enabled.
    if (config.batching?.enabled && transports.every((transport) => transport.isBatched())) {
      return;
    }

    const [filteredItem] = applyBeforeSendHooks([item]);

    if (filteredItem === undefined) {
      return;
    }

    for (const transport of transports) {
      internalLogger.debug(`Transporting item using ${transport.name}\n`, filteredItem);
      if (!transport.isBatched()) {
        transport.send(filteredItem);
      } else if (!config.batching?.enabled) {
        transport.send([filteredItem]);
      }
    }
  };

  let batchExecutor: BatchExecutor | undefined;

  if (config.batching?.enabled) {
    batchExecutor = new BatchExecutor(batchedSend, {
      sendTimeout: config.batching.sendTimeout,
      itemLimit: config.batching.itemLimit,
      paused,
    });
  }

  // Send a signal to the appropriate transports
  //
  // 1. If SDK is paused, early return
  // 2. If batching is not enabled send the signal to all transports
  //    instantly.
  // 3i. If batching is enabled, enqueue the signal
  // 3ii. Send the signal instantly to all un-batched transports
  const execute: Transports['execute'] = (item) => {
    if (paused) {
      return;
    }

    if (config.batching?.enabled) {
      batchExecutor?.addItem(item);
    }

    instantSend(item);
  };

  const getBeforeSendHooks: Transports['getBeforeSendHooks'] = () => [...beforeSendHooks];

  const isPaused: Transports['isPaused'] = () => paused;

  const pause: Transports['pause'] = () => {
    internalLogger.debug('Pausing transports');
    batchExecutor?.pause();

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
    batchExecutor?.start();

    paused = false;
  };

  return {
    add,
    addBeforeSendHooks,
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
/**
 * Removes the `payload.originalError` property from the provided `TransportItem[]` parameter.
 */
function sanitizeItems(filteredItems: Array<TransportItem<APIEvent>>, config: Config<APIEvent>) {
  if (config.preserveOriginalError) {
    for (const item of filteredItems) {
      if (item.type === TransportItemType.EXCEPTION) {
        delete (item as TransportItem<ExceptionEvent<true>>).payload.originalError;
      }
    }
  }

  return filteredItems;
}
