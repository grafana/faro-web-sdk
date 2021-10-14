import { config } from './config';
import type { ExceptionEvent, LogEvent } from './logger';
import { getMetaValues } from './meta';
import type { MetaValues } from './meta';

export enum ApiPayloadItems {
  LOG = 'logs',
  EXCEPTION = 'exceptions',
}

export interface ApiPayload {
  [ApiPayloadItems.LOG]: LogEvent[];
  [ApiPayloadItems.EXCEPTION]: ExceptionEvent[];
  meta?: MetaValues;
}

export function sendRequest(payload: ApiPayload): void {
  try {
    fetch(config.receiverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        meta: {
          ...getMetaValues(),
          ...(payload.meta ?? {}),
        },
      }),
    }).catch();
  } catch (err) {}
}
