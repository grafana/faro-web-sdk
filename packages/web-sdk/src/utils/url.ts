import { faro } from '@grafana/faro-core';
import type { Patterns, Transport } from '@grafana/faro-core';

/**
 * Retrieves a list of URLs to be ignored by aggregating the ignore URLs from all transports.
 *
 * @returns {string[]} An array of URLs to be ignored.
 */
export function getIgnoreUrls(): Patterns {
  return faro.transports.transports.flatMap((transport: Transport) => transport.getIgnoreUrls());
}

/**
 * Checks if the given URL should be ignored based on a list of ignored URLs.
 *
 * @param url - The URL to check.
 * @returns `true` if the URL is in the list of ignored URLs, `false` otherwise.
 */
export function isUrlIgnored(url = ''): boolean {
  return getIgnoreUrls().some((ignoredUrl) => url && url.match(ignoredUrl) != null);
}
