import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import { isFunction } from '../utils';
import { VERSION } from '../version';
import type { Meta, Metas, MetaItem, MetasListener } from './types';

export function initializeMetas(internalLogger: InternalLogger, config: Config): Metas {
  let items: MetaItem[] = [];
  let listeners: MetasListener[] = [];

  const _getValue = () => {
    return items.reduce<Meta>((acc, item) => {
      Object.assign(acc, isFunction(item) ? item() : item);
      return acc;
    }, {});
  };

  const _notifyListeners = () => {
    if (listeners.length) {
      const value = _getValue();
      listeners.forEach((listener) => listener(value));
    }
  };

  const add: Metas['add'] = (...newItems) => {
    internalLogger.debug('Adding metas\n', newItems);
    items.push(...newItems);
    _notifyListeners();
  };

  const remove: Metas['remove'] = (...itemsToRemove) => {
    internalLogger.debug('Removing metas\n', itemsToRemove);
    items = items.filter((currentItem) => !itemsToRemove.includes(currentItem));
    _notifyListeners();
  };

  const initial: Meta = {
    sdk: {
      name: '@grafana/agent-core',
      version: VERSION,
      integrations: config.instrumentations.map(({ name, version }) => ({ name, version })),
    },
  };

  if (config.app) {
    initial.app = config.app;
  }

  if (config.user) {
    initial.user = config.user;
  }

  add(initial, ...(config.metas ?? []));

  const addListener: Metas['addListener'] = (listener) => {
    listeners.push(listener);
  };

  const removeListener: Metas['removeListener'] = (listener) => {
    listeners = listeners.filter((l) => l !== listener);
  };

  return {
    add,
    remove,
    addListener,
    removeListener,
    get value() {
      return _getValue();
    },
  };
}
