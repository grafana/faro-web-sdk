import type { Patterns } from '@grafana/faro-core';

export interface XHRInstrumentationOptions {
  // For these URLs no events will be tracked
  ignoredUrls?: Patterns;
  propagateRumHeaderCorsUrls?: Patterns;
}

export enum XHREventType {
  LOAD = 'faro.xhr.load',
  ABORT = 'faro.xhr.abort',
  ERROR = 'faro.xhr.error',
  TIMEOUT = 'faro.xhr.timeout',
}

export const serverTimingHeader = 'server-timing';
export const faroRumHeader = 'x-faro-session';

export const makeFaroRumHeaderValue = (sessionId: string): string => {
  return `session_id=${sessionId}`;
};
