export interface XHRInstrumentationOptions {
  // For these URLs no events will be tracked
  ignoredUrls?: Array<string | RegExp>;
  // For testing purposes - if true, fetch will be writable - necessary for jest tests
  testing?: boolean;
}

// TODO - add Marco's namespacing feature
export enum XHREventType {
  LOAD = 'XHR load',
  ABORT = 'XHR abort',
  ERROR = 'XHR error',
  TIMEOUT = 'XHR timeout',
}
