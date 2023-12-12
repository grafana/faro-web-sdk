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

export function calculateResourceTimings(resourceEntryRaw: any): FaroResourceTiming {
  return {
    tcpHandshakeTime: String(resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart),
    dnsLookupTime: String(resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart),
    tlsNegotiationTime: String(resourceEntryRaw.requestStart - resourceEntryRaw.secureConnectionStart),
    redirectLookupTime: String(resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart),
    requestTime: String(resourceEntryRaw.responseStart - resourceEntryRaw.requestStart),
    fetchTime: String(resourceEntryRaw.responseEnd - resourceEntryRaw.fetchStart),
    serviceWorkerProcessingTime: String(resourceEntryRaw.fetchStart - resourceEntryRaw.workerStart),

    isCompressed: String(resourceEntryRaw.decodedBodySize !== resourceEntryRaw.encodedBodySize),
    // decodedBodySize: String(resourceEntryRaw.encodedBodySize),
    // unCompressedBodySize: String(resourceEntryRaw.decodedBodySize),

    isCacheHit: String(resourceEntryRaw.transferSize === 0),
    renderBlocking: resourceEntryRaw.renderBlockingStatus ?? 'unknown',
    protocol: resourceEntryRaw.nextHopProtocol,
    is304: String(
      resourceEntryRaw.encodedBodySize > 0 &&
        resourceEntryRaw.tranferSize > 0 &&
        resourceEntryRaw.tranferSize < resourceEntryRaw.encodedBodySize
    ),
  };
}

export function calculateNavigationTimings(navigationEntryRaw: any): FaroNavigationTiming {
  return {
    totalNavigationTime: String(navigationEntryRaw.duration),
    visibilityState: document.visibilityState,
    documentProcessingDuration: String(navigationEntryRaw.loadEventEnd - navigationEntryRaw.responseEnd),
    pagLoadTime: String(navigationEntryRaw.domContentLoadedEventStart - navigationEntryRaw.fetchStart),
    scriptProcessingDuration: String(
      navigationEntryRaw.domContentLoadedEventEnd - navigationEntryRaw.domContentLoadedEventStart
    ),
    pageChildrenProcessingDuration: String(
      navigationEntryRaw.loadEventEnd - navigationEntryRaw.domContentLoadedEventEnd
    ),
    ttfb: String(navigationEntryRaw.responseStart - navigationEntryRaw.fetchStart),
  };
}

// TODO: q: apply compression in a later iteration?
// export function performanceTimingCompressor() {}
// export function navigationTimingCompressor() {}
