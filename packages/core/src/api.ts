import { config } from './config';
import { getMetaValues } from './meta';
import { ApiPayload } from './types';

export function sendRequest(payload: ApiPayload) {
  try {
    fetch(config.receiverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        meta: getMetaValues(),
      }),
    });
  } catch (err) {}
}
