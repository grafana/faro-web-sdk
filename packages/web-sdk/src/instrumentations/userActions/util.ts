import type { HttpRequestEndMessage, HttpRequestStartMessage } from '../_internal/monitors/types';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';

/**
 * Parses the action attribute name by removing the 'data-' prefix and converting
 * the remaining string to camelCase.
 *
 * This is needed because the browser will remove the 'data-' prefix and the dashes from
 * data attributes and make then camelCase.
 */
export function convertDataAttributeName(userActionDataAttribute: string) {
  const withoutData = userActionDataAttribute.split('data-')[1];
  const withUpperCase = withoutData?.replace(/-(.)/g, (_, char) => char.toUpperCase());
  return withUpperCase?.replace(/-/g, '');
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
