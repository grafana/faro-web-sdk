import type { CacheType, FaroNavigationTiming, FaroResourceTiming } from './types';

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
    const readyStateCompleteHandler = () => {
      if (document.readyState === 'complete') {
        handleReady();
        document.removeEventListener('readystatechange', readyStateCompleteHandler);
      }
    };

    document.addEventListener('readystatechange', readyStateCompleteHandler);
  }
}

export function calculateFaroResourceTiming(resourceEntryRaw: PerformanceResourceTiming): FaroResourceTiming {
  const {
    connectEnd,
    connectStart,
    decodedBodySize,
    domainLookupEnd,
    domainLookupStart,
    encodedBodySize,
    fetchStart,
    initiatorType,
    name,
    nextHopProtocol,
    redirectEnd,
    redirectStart,
    // @ts-expect-error the renderBlockingStatus property is not available in all browsers
    renderBlockingStatus: rbs,
    requestStart,
    responseEnd,
    responseStart,
    // @ts-expect-error the renderBlockingStatus property is not available in all browsers
    responseStatus,
    secureConnectionStart,
    transferSize,
    workerStart,
  } = resourceEntryRaw;

  return {
    name: name,
    tcpHandshakeTime: toFaroPerformanceTimingString(connectEnd - connectStart),
    dnsLookupTime: toFaroPerformanceTimingString(domainLookupEnd - domainLookupStart),
    tlsNegotiationTime: toFaroPerformanceTimingString(requestStart - secureConnectionStart),
    redirectTime: toFaroPerformanceTimingString(redirectEnd - redirectStart),
    requestTime: toFaroPerformanceTimingString(responseStart - requestStart),
    responseTime: toFaroPerformanceTimingString(responseEnd - responseStart),
    fetchTime: toFaroPerformanceTimingString(responseEnd - fetchStart),
    serviceWorkerTime: toFaroPerformanceTimingString(fetchStart - workerStart),
    decodedBodySize: toFaroPerformanceTimingString(decodedBodySize),
    encodedBodySize: toFaroPerformanceTimingString(encodedBodySize),
    cacheHitStatus: getCacheType(),
    renderBlockingStatus: toFaroPerformanceTimingString(rbs) as FaroResourceTiming['renderBlockingStatus'],
    protocol: nextHopProtocol,
    initiatorType: initiatorType,

    // TODO: add in future iteration, ideally after nested objects are supported by the collector.
    // serverTiming: resourceEntryRaw.serverTiming,
  };

  function getCacheType(): CacheType {
    let cacheType: CacheType = 'fullLoad';
    if (transferSize === 0) {
      if (decodedBodySize > 0) {
        cacheType = 'cache';
      }
    } else {
      if (responseStatus != null) {
        if (responseStatus === 304) {
          cacheType = 'conditionalFetch';
        }
      } else if (encodedBodySize > 0 && transferSize < encodedBodySize) {
        cacheType = 'conditionalFetch';
      }
    }
    return cacheType;
  }
}

export function calculateFaroNavigationTiming(navigationEntryRaw: PerformanceNavigationTiming): FaroNavigationTiming {
  const {
    activationStart,
    domComplete,
    domContentLoadedEventEnd,
    domContentLoadedEventStart,
    domInteractive,
    duration,
    fetchStart,
    loadEventEnd,
    loadEventStart,
    responseStart,
    type,
  } = navigationEntryRaw;

  return {
    visibilityState: document.visibilityState,
    totalNavigationTime: toFaroPerformanceTimingString(duration),
    pageLoadTime: toFaroPerformanceTimingString(domComplete - fetchStart),
    domProcessingTime: toFaroPerformanceTimingString(domComplete - domInteractive),
    domContentLoadHandlerTime: toFaroPerformanceTimingString(domContentLoadedEventEnd - domContentLoadedEventStart),
    onLoadTime: toFaroPerformanceTimingString(loadEventEnd - loadEventStart),

    // For more accuracy on prerendered pages page we calculate relative top the activationStart instead of the start of the navigation.
    // clamp to 0 if activationStart occurs after first byte is received.
    ttfb: toFaroPerformanceTimingString(Math.max(responseStart - (activationStart ?? 0), 0)),

    type: type,
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
