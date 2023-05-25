import { globalObject } from "@grafana/faro-core";

export const originalFetch = globalObject.fetch;
export const fetchGlobalObjectKey = 'fetch';
export const originalFetchGlobalObjectKey = 'originalFetch';
