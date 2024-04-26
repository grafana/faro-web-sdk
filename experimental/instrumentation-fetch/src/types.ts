import type { Patterns } from '@grafana/faro-core';

/**
 * Interface used to provide information to finish span on fetch error
 */
export interface FetchError {
  status?: number;
  message: string;
}

export interface FetchInstrumentationOptions {
  // For these URLs no events will be tracked
  ignoredUrls?: Patterns;
  // For testing purposes - if true, fetch will be writable - necessary for jest tests
  testing?: boolean;

  /**
   * RUM headers are only added to URLs which have the same origin as the document.
   * Ad other URLs which should have RUM headers added to this list.
   */
  propagateRumHeaderCorsUrls?: Patterns;
}
