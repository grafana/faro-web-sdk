
import { globalObject } from "@grafana/faro-core";

interface StringResponse {
  bodyUsed: string;
  ok: string;
  redirected: string;
  status: string;
  statusText: string;
  type: string;
  url: string;
}

export const originalFetch = globalObject.fetch;
export const fetchGlobalObjectKey = 'fetch';
export const originalFetchGlobalObjectKey = 'originalFetch';
export const eventDomain = 'fetch';
export const resolvedFetchEventName = 'Resolved fetch';
export const rejectedFetchEventName = 'Rejected fetch';

export const responseProperties = (response: Partial<Response>): StringResponse => {
  return {
    bodyUsed: response.bodyUsed?.toString() ?? '',
    ok: response.ok?.toString() ?? '',
    redirected: response.redirected?.toString() ?? '',
    status: response.status?.toString() ?? '',
    statusText: response.statusText?.toString() ?? '',
    type: response.type?.toString() ?? '',
    url: response.url?.toString() ?? '',
  };
};

export const parseHeaders = (headers: Headers): Record<string, string> => {
  const newHeaders: Record<string, string> = {};
  const headerObj = Object.fromEntries((headers as any).entries());
  for (const [key, value] of Object.entries(headerObj)) {
    newHeaders[`header_${key}`] = value;
  }
  return newHeaders;
}
