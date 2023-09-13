export interface XHRInstrumentationOptions {
  // For these URLs no events will be tracked
  ignoredUrls?: Array<string | RegExp>;
  // For testing purposes - if true, fetch will be writable - necessary for jest tests
  testing?: boolean;
}

export enum XHREventType {
  LOAD = 'faro.xhr.load',
  ABORT = 'faro.xhr.abort',
  ERROR = 'faro.xhr.error',
  TIMEOUT = 'faro.xhr.timeout',
}
