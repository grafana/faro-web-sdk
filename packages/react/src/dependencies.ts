import type { API, InternalLogger } from '@grafana/faro-web-sdk';

export let internalLogger: InternalLogger;
export let api: API;

export function setDependencies(newInternalLogger: InternalLogger, newApi: API): void {
  internalLogger = newInternalLogger;
  api = newApi;
}
