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
  let captureListeners: Array<() => void> = [];
  let capturing = false;

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

  const capture: Metas['capture'] = (callback) => {
    // Nested telemetry shares the same synchronous capture, including callbacks
    // that assign recording identity before submitting their events.
    const nested = capturing;
    capturing = true;
    try {
      if (!nested) {
        captureListeners.forEach((listener) => listener());
      }
      const value = getValue();
      callback?.();
      return value;
    } finally {
      capturing = nested;
    }
  };

  return {
    add,
    remove,
    addListener,
    removeListener,
    capture,
    addCaptureListener: (listener) => {
      captureListeners.push(listener);
    },
    removeCaptureListener: (listener) => {
      captureListeners = captureListeners.filter((current) => current !== listener);
    },
    get value() {
      return getValue();
    },
  };
}
