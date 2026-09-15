import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { isFunction } from '../utils';

import { markMetaCaptured } from './capture';
import type { Meta, MetaItem, Metas, MetasListener } from './types';

export function initializeMetas(
  _unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  _config: Config
): Metas {
  let items: MetaItem[] = [];
  let listeners: MetasListener[] = [];
  let captureListeners: Array<() => void> = [];
  let pendingCaptureListeners: Array<() => void> | undefined;
  let nextCaptureListener = 0;
  let captureListenerCount = 0;

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

  const capture: NonNullable<Metas['capture']> = (callback) => {
    // Nested telemetry drains pending reconciliation but never reruns active or
    // completed listeners, including when a capture callback submits events.
    const nested = pendingCaptureListeners !== undefined;
    const cycleListeners = pendingCaptureListeners ?? captureListeners;
    if (!nested) {
      // Preserve forEach's array and length semantics if listeners are changed.
      pendingCaptureListeners = cycleListeners;
      nextCaptureListener = 0;
      captureListenerCount = cycleListeners.length;
    }
    try {
      while (nextCaptureListener < captureListenerCount) {
        const listener = cycleListeners[nextCaptureListener++];
        listener?.();
      }
      const value = markMetaCaptured(getValue());
      callback?.();
      return value;
    } finally {
      if (!nested) {
        pendingCaptureListeners = undefined;
      }
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
