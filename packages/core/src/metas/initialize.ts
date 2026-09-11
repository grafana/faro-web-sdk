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
  const sessionPreparations = new Set<object>();
  let activeCapture: { listeners: Array<() => void>; next: number; failure?: { error: unknown } } | undefined;

  const getValue = (): Meta => {
    try {
      return items.reduce<Meta>((acc, item) => Object.assign(acc, isFunction(item) ? item() : item), {});
    } catch (error) {
      if (activeCapture) {
        activeCapture.failure ??= { error };
      }
      throw error;
    }
  };

  const notifyListeners = () => {
    // A listener can replace metadata. Later deliveries must see that replacement.
    listeners.forEach((listener) => {
      if (activeCapture?.failure) {
        throw activeCapture.failure.error;
      }
      const value = getValue();
      if (activeCapture?.failure) {
        throw activeCapture.failure.error;
      }
      listener(value);
    });
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

  const assertCaptureAllowed = () => {
    if (sessionPreparations.size > 0) {
      const error = new Error('Telemetry submitted during session preparation was discarded');
      internalLogger.warn(error.message);
      throw error;
    }
    if (activeCapture?.failure) {
      throw activeCapture.failure.error;
    }
  };

  const capture: NonNullable<Metas['capture']> = (callback) => {
    assertCaptureAllowed();
    // Nested telemetry drains pending reconciliation but never reruns active or
    // completed listeners, including when a capture callback submits events.
    const nested = activeCapture !== undefined;
    const cycle = (activeCapture ??= { listeners: captureListeners.slice(), next: 0 });
    const checkFailure = () => {
      if (cycle.failure) {
        throw cycle.failure.error;
      }
    };
    try {
      while (cycle.next < cycle.listeners.length) {
        try {
          cycle.listeners[cycle.next++]?.();
        } catch (error) {
          cycle.failure ??= { error };
        }
        checkFailure();
      }
      const value = markMetaCaptured(getValue());
      checkFailure();
      callback?.();
      checkFailure();
      return value;
    } finally {
      if (!nested) {
        activeCapture = undefined;
      }
    }
  };

  return {
    add,
    remove,
    replace: (previous, replacement) => {
      items = items.filter((item) => item !== previous);
      items.push(replacement);
      if (!isFunction(replacement) && 'session' in replacement) {
        sessionPreparations.clear();
      }
      notifyListeners();
    },
    beginSessionUpdate: () => {
      const preparation = {};
      sessionPreparations.add(preparation);
      return () => {
        sessionPreparations.delete(preparation);
      };
    },
    addListener,
    removeListener,
    assertCaptureAllowed,
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
