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
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'complete') {
        handleReady();
      }
    });
  }
}

export function calculateFaroResourceTimings(resourceEntryRaw: PerformanceResourceTiming): FaroResourceTiming {
  return {
    name: resourceEntryRaw.name,
    tcpHandshakeTime: toFaroPerformanceTimingString(resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart),
    dnsLookupTime: toFaroPerformanceTimingString(resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart),
    tlsNegotiationTime: toFaroPerformanceTimingString(
      resourceEntryRaw.requestStart - resourceEntryRaw.secureConnectionStart
    ),
    redirectLookupTime: toFaroPerformanceTimingString(resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart),
    requestTime: toFaroPerformanceTimingString(resourceEntryRaw.responseStart - resourceEntryRaw.requestStart),
    fetchTime: toFaroPerformanceTimingString(resourceEntryRaw.responseEnd - resourceEntryRaw.fetchStart),
    serviceWorkerProcessingTime: toFaroPerformanceTimingString(
      resourceEntryRaw.fetchStart - resourceEntryRaw.workerStart
    ),
    decodedBodySize: toFaroPerformanceTimingString(resourceEntryRaw.encodedBodySize),
    unCompressedBodySize: toFaroPerformanceTimingString(resourceEntryRaw.decodedBodySize),
    isCacheHit: toFaroPerformanceTimingString(
      resourceEntryRaw.transferSize === 0 && resourceEntryRaw.decodedBodySize > 0
    ),

    // @ts-expect-error the renderBlocking property is not available in all browsers
    renderBlockingStatus: toFaroPerformanceTimingString(resourceEntryRaw.renderBlockingStatus),

    protocol: resourceEntryRaw.nextHopProtocol,
    initiatorType: resourceEntryRaw.initiatorType,

    // TODO: add in future iteration, ideally after nested objects are supported by the collector.
    // serverTiming: resourceEntryRaw.serverTiming,
  };
}

export function calculateFaroNavigationTimings(navigationEntryRaw: PerformanceNavigationTiming): FaroNavigationTiming {
  return {
    totalNavigationTime: toFaroPerformanceTimingString(navigationEntryRaw.duration),
    visibilityState: document.visibilityState,
    pagLoadTime: toFaroPerformanceTimingString(
      navigationEntryRaw.domContentLoadedEventStart - navigationEntryRaw.fetchStart
    ),
    documentProcessingDuration: toFaroPerformanceTimingString(
      navigationEntryRaw.loadEventEnd - navigationEntryRaw.responseEnd
    ),
    domLoadTime: toFaroPerformanceTimingString(
      navigationEntryRaw.loadEventEnd - navigationEntryRaw.domContentLoadedEventEnd
    ),
    scriptProcessingDuration: toFaroPerformanceTimingString(
      navigationEntryRaw.domContentLoadedEventEnd - navigationEntryRaw.domContentLoadedEventStart
    ),
    ttfb: toFaroPerformanceTimingString(navigationEntryRaw.responseStart - navigationEntryRaw.fetchStart),
    type: navigationEntryRaw.type,
  };
}

function toFaroPerformanceTimingString(v: unknown): string {
  if (v == null) {
    return 'unknown';
  }

  if (typeof v === 'number') {
    return Math.round(v).toString();
  }

  return v.toString();
}
