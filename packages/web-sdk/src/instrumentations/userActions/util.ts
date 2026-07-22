import { noop } from '@grafana/faro-core';

import type { HttpRequestEndMessage, HttpRequestStartMessage } from '../_internal/monitors/types';

import {
  defaultInitialActivityTimeout,
  maxInitialActivityTimeout,
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
} from './const';

export type TimeoutWarning = (message: string) => void;

export function normalizeDataAttributeName(dataAttributeName: string): string {
  const withoutPrefix = dataAttributeName.startsWith('data-') ? dataAttributeName.slice(5) : dataAttributeName;
  const kebabCase = withoutPrefix.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  return `data-${kebabCase}`;
}

export function deriveUserActionTimeoutDataAttribute(dataAttributeName: string): string {
  const normalizedName = normalizeDataAttributeName(dataAttributeName);

  return normalizedName.endsWith('-name')
    ? `${normalizedName.slice(0, -'-name'.length)}-timeout`
    : `${normalizedName}-timeout`;
}

export function normalizeInitialActivityTimeout(
  value: unknown,
  fallback = defaultInitialActivityTimeout,
  warn: TimeoutWarning = noop
): number {
  if (value === undefined) {
    return fallback;
  }

  const timeout = typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value);

  if (!Number.isFinite(timeout) || timeout <= 0) {
    warn(`initialActivityTimeout must be a finite number greater than zero; using ${fallback} ms`);
    return fallback;
  }

  if (timeout > maxInitialActivityTimeout) {
    warn(`initialActivityTimeout cannot exceed ${maxInitialActivityTimeout} ms; clamping to the maximum`);
    return maxInitialActivityTimeout;
  }

  return timeout;
}

/**
 * Parses the action attribute name by removing the 'data-' prefix and converting
 * the remaining string to camelCase.
 *
 * This is needed because the browser will remove the 'data-' prefix and the dashes from
 * data attributes and make then camelCase.
 */
export function convertDataAttributeName(userActionDataAttribute: string) {
  const withoutData = normalizeDataAttributeName(userActionDataAttribute).slice(5);
  return withoutData.replace(/-(.)/g, (_, char) => char.toUpperCase());
}

export function startTimeout(timeoutId: number | undefined, cb: () => void, delay: number) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  //@ts-expect-error for some reason vscode is using the node types
  timeoutId = setTimeout(() => {
    cb();
  }, delay);

  return timeoutId;
}

export function isRequestStartMessage(msg: any): msg is HttpRequestStartMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_START;
}

export function isRequestEndMessage(msg: any): msg is HttpRequestEndMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_END;
}
