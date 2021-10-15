import type { ApiHandlerPayload } from './handlers';

export function consoleApiHandler(payload: ApiHandlerPayload): void {
  // eslint-disable-next-line no-console
  console.debug(payload);
}
