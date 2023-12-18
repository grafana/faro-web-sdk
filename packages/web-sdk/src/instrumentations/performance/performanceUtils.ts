import type { FaroNavigationTiming, FaroResourceTiming } from './types';

export function performanceObserverSupported(): boolean {
  return 'PerformanceObserver' in window;
}

export function entryUrlIsIgnored(ignoredUrls: Array<string | RegExp> = [], entryName: string): boolean {
  return ignoredUrls.some((url) => entryName.match(url) != null);
}

export function onDocumentReady(handleReady: () => void) {
  if (document.readyState === 'complete') {
    handleReady();
  } else {
    document.addEventListener('readystatechange', (_event) => {
      if (document.readyState === 'complete') {
        handleReady();
      }
    });
  }
}

export function calculateFaroResourceTimings(resourceEntryRaw: PerformanceResourceTiming): FaroResourceTiming {
  return {
    name: resourceEntryRaw.name,
    tcpHandshakeTime: `${resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart}`,
    dnsLookupTime: `${resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart}`,
    tlsNegotiationTime: `${resourceEntryRaw.requestStart - resourceEntryRaw.secureConnectionStart}`,
    redirectLookupTime: `${resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart}`,
    requestTime: `${resourceEntryRaw.responseStart - resourceEntryRaw.requestStart}`,
    fetchTime: `${resourceEntryRaw.responseEnd - resourceEntryRaw.fetchStart}`,
    serviceWorkerProcessingTime: `${resourceEntryRaw.fetchStart - resourceEntryRaw.workerStart}`,
    decodedBodySize: `${resourceEntryRaw.encodedBodySize}`,
    unCompressedBodySize: `${resourceEntryRaw.decodedBodySize}`,
    isCacheHit: `${resourceEntryRaw.transferSize === 0 && resourceEntryRaw.decodedBodySize > 0}`,

    // @ts-expect-error the renderBlocking property is not available in all browsers
    renderBlockingStatus: resourceEntryRaw.renderBlockingStatus ?? 'unknown',

    protocol: resourceEntryRaw.nextHopProtocol,
    initiatorType: resourceEntryRaw.initiatorType,
    // serverTiming: resourceEntryRaw.serverTiming,
  };
}

export function calculateFaroNavigationTimings(navigationEntryRaw: PerformanceNavigationTiming): FaroNavigationTiming {
  return {
    totalNavigationTime: `${navigationEntryRaw.duration}`,
    visibilityState: document.visibilityState,
    pagLoadTime: `${navigationEntryRaw.domContentLoadedEventStart - navigationEntryRaw.fetchStart}`,
    documentProcessingDuration: `${navigationEntryRaw.loadEventEnd - navigationEntryRaw.responseEnd}`,
    domLoadTime: `${navigationEntryRaw.loadEventEnd - navigationEntryRaw.domContentLoadedEventEnd}`,
    scriptProcessingDuration: `${
      navigationEntryRaw.domContentLoadedEventEnd - navigationEntryRaw.domContentLoadedEventStart
    }`,
    ttfb: `${navigationEntryRaw.responseStart - navigationEntryRaw.fetchStart}`,
    type: navigationEntryRaw.type,
  };
}
