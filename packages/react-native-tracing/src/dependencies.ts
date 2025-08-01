import type { API } from '@grafana/faro-core';

export let api: API;

export function setDependencies(faro: API): void {
  api = faro;
}
