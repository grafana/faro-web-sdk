import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { isFunction } from '../utils';

import type { Meta, MetaItem, Metas, MetasListener } from './types';

export function initializeMetas(
  _unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  _config: Config
): Metas {
  let items: MetaItem[] = [];
  let listeners: MetasListener[] = [];

  const getValue = () => items.reduce<Meta>((acc, item) => Object.assign(acc, isFunction(item) ? item() : item), {});

  const notifyListeners = () => {
    if (listeners.length) {
      const value = getValue();

      listeners.forEach((listener) => listener(value));
    }
  };

  const add: Metas['add'] = (...newItems) => {
    internalLogger.debug('Adding metas\n', newItems);

    items.push(...newItems);

    notifyListeners();
  };

  const remove: Metas['remove'] = (...itemsToRemove) => {
    internalLogger.debug('Removing metas\n', itemsToRemove);

    items = items.filter((currentItem) => !itemsToRemove.includes(currentItem));

    notifyListeners();
  };

  const addListener: Metas['addListener'] = (listener) => {
    internalLogger.debug('Adding metas listener\n', listener);

    listeners.push(listener);
  };

  const removeListener: Metas['removeListener'] = (listener) => {
    internalLogger.debug('Removing metas listener\n', listener);

    listeners = listeners.filter((currentListener) => currentListener !== listener);
  };

  return {
    add,
    remove,
    addListener,
    removeListener,
    get value() {
      return getValue();
    },
  };
}
