import { faro, isEmpty, isFunction, isString } from '@grafana/faro-core';
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

/**
 * Extracts a URL string from the given resource.
 *
 * @param resource - The input resource which can be a string, a URL object, or an object with a `toString` method.
 * @returns The URL as a string if the resource is a valid URL-like object, or `undefined` if the resource is not valid.
 *
 */
export function getUrlFromResource(resource: any): string | undefined {
  if (isString(resource)) {
    return resource;
  }

  if (resource instanceof URL) {
    return resource.href;
  }

  if (!isEmpty(resource) && isFunction(resource?.toString)) {
    return resource.toString();
  }

  return undefined;
}
