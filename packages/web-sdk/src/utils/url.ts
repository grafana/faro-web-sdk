import { faro } from '@grafana/faro-core';
import type { Transport } from '@grafana/faro-core';

/**
 * Get all configured ignore URLs.
 */
export function getIgnoreUrls() {
  return faro.transports.transports.flatMap((transport: Transport) => transport.getIgnoreUrls());
}

export function isSameDomain(url: URL): boolean {
  return url.hostname === window.location.hostname;
}

export const firstPartyDomainAttribute = 'firstParty';
export const thirdPartyDomainAttribute = 'thirdParty';

export function getDomainLevelAttribute(url: URL): typeof firstPartyDomainAttribute | typeof thirdPartyDomainAttribute {
  return isSameDomain(url) ? firstPartyDomainAttribute : thirdPartyDomainAttribute;
}
