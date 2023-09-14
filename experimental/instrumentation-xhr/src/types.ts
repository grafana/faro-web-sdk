export interface XHRInstrumentationOptions {
  // For these URLs no events will be tracked
  ignoredUrls?: Array<string | RegExp>;
}

export enum XHREventType {
  LOAD = 'faro.xhr.load',
  ABORT = 'faro.xhr.abort',
  ERROR = 'faro.xhr.error',
  TIMEOUT = 'faro.xhr.timeout',
}
