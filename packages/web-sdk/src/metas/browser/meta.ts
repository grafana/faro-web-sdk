import { unknownString } from '@grafana/faro-core';
import type { Meta, MetaBrowser, MetaItem } from '@grafana/faro-core';

import { parseUserAgent } from './parseUserAgent';

export const browserMeta: MetaItem<Pick<Meta, 'browser'>> = () => {
  const userAgent = navigator.userAgent;
  const parsed = parseUserAgent(userAgent);
  const { name, version } = parsed.browser;
  const { name: osName, version: osVersion } = parsed.os;
  const language = navigator.language;
  const mobile = navigator.userAgent.includes('Mobi');
  const brands = getBrands();

  return {
    browser: {
      name: name ?? unknownString,
      version: version ?? unknownString,
      os: `${osName ?? unknownString} ${osVersion ?? unknownString}`,
      userAgent: userAgent ?? unknownString,
      language: language ?? unknownString,
      mobile,
      brands: brands ?? unknownString,
      viewportWidth: `${window.innerWidth}`,
      viewportHeight: `${window.innerHeight}`,
    },
  };

  function getBrands(): MetaBrowser['brands'] | undefined {
    if (!name || !version) {
      return undefined;
    }

    if ('userAgentData' in navigator && navigator.userAgentData) {
      // userAgentData in experimental (only Chrome supports it) thus TS does not ship the respective type declarations
      return (navigator as any).userAgentData.brands;
    }

    return undefined;
  }
};
