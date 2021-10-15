import type { ApiHandler, ApiHandlerPayload } from './handlers';

const baseOptions: Partial<RequestInit> = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

export function getFetchApiHandler(url: string): ApiHandler {
  return (payload: ApiHandlerPayload) => {
    try {
      fetch(url, {
        ...baseOptions,
        body: JSON.stringify(payload),
      }).catch();
    } catch (err) {}
  };
}
