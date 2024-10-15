import { isArray, type PushEventOptions, unknownString } from '@grafana/faro-core';

import type { CacheType, FaroNavigationTiming, FaroResourceTiming } from './types';

const w3cTraceparentFormat = /^00-[a-f0-9]{32}-[a-f0-9]{16}-[0-9]{1,2}$/;

type SpanContext = PushEventOptions['spanContext'];

// Extract traceparent from serverTiming, if present
export function getSpanContextFromServerTiming(serverTimings: PerformanceServerTiming[] = []): SpanContext | undefined {
  for (const serverEntry of serverTimings) {
    if (serverEntry.name === 'traceparent') {
      if (!w3cTraceparentFormat.test(serverEntry.description)) {
        continue;
      }

      const [, traceId, spanId] = serverEntry.description.split('-');
      if (traceId != null && spanId != null) {
        return { traceId, spanId };
      }

      break;
    }
  }

  return undefined;
}

export function performanceObserverSupported(): boolean {
  return 'PerformanceObserver' in window;
}

export function entryUrlIsIgnored(ignoredUrls: Array<string | RegExp> = [], entryName: string): boolean {
  return ignoredUrls.some((url) => url && entryName.match(url) != null);
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

type PerformanceEntryAllowProperties = Record<string, Array<string | number> | string | number>;

export function includePerformanceEntry(
  performanceEntryJSON: Record<string, any>,
  allowProps: PerformanceEntryAllowProperties = {}
): boolean {
  for (const [allowPropKey, allowPropValue] of Object.entries(allowProps)) {
    const perfEntryPropVal = performanceEntryJSON[allowPropKey];

    if (perfEntryPropVal == null) {
      return false;
    }

    if (isArray(allowPropValue)) {
      return allowPropValue.includes(perfEntryPropVal);
    }

    return perfEntryPropVal === allowPropValue;
  }

  // empty object allows all
  return true;
}

export function createFaroResourceTiming(resourceEntryRaw: PerformanceResourceTiming): FaroResourceTiming {
  const {
    connectEnd,
    connectStart,
    decodedBodySize,
    domainLookupEnd,
    domainLookupStart,
    duration,
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
    duration: toFaroPerformanceTimingString(duration),
    tcpHandshakeTime: toFaroPerformanceTimingString(connectEnd - connectStart),
    dnsLookupTime: toFaroPerformanceTimingString(domainLookupEnd - domainLookupStart),
    tlsNegotiationTime: toFaroPerformanceTimingString(requestStart - secureConnectionStart),
    responseStatus: toFaroPerformanceTimingString(responseStatus),
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
    visibilityState: document.visibilityState,
    ttfb: toFaroPerformanceTimingString(responseStart - requestStart),

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

export function createFaroNavigationTiming(navigationEntryRaw: PerformanceNavigationTiming): FaroNavigationTiming {
  const {
    activationStart,
    domComplete,
    domContentLoadedEventEnd,
    domContentLoadedEventStart,
    domInteractive,
    fetchStart,
    loadEventEnd,
    loadEventStart,
    responseStart,
    type,
  } = navigationEntryRaw;

  const parserStart = getDocumentParsingTime();

  return {
    ...createFaroResourceTiming(navigationEntryRaw),
    pageLoadTime: toFaroPerformanceTimingString(domComplete - fetchStart),
    documentParsingTime: toFaroPerformanceTimingString(parserStart ? domInteractive - parserStart : null),
    domProcessingTime: toFaroPerformanceTimingString(domComplete - domInteractive),
    domContentLoadHandlerTime: toFaroPerformanceTimingString(domContentLoadedEventEnd - domContentLoadedEventStart),
    onLoadTime: toFaroPerformanceTimingString(loadEventEnd - loadEventStart),

    // For navigation entries we can calculate the TTFB based on activationStart. We overwrite the TTFB value coming with the resource entry.
    // For more accuracy on prerendered pages page we calculate relative top the activationStart instead of the start of the navigation.
    // clamp to 0 if activationStart occurs after first byte is received.
    ttfb: toFaroPerformanceTimingString(Math.max(responseStart - (activationStart ?? 0), 0)),
    type: type,
  };
}

function getDocumentParsingTime(): number | null {
  if (performance.timing?.domLoading != null) {
    // the browser is about to start parsing the first received bytes of the HTML document.
    // This property is deprecated but there isn't a really good alternative atm.
    // For now we stick with domLoading and keep researching a better alternative.
    return performance.timing.domLoading - performance.timeOrigin;
  }

  return null;
}

function toFaroPerformanceTimingString(v: unknown): string {
  if (v == null) {
    return unknownString;
  }

  if (typeof v === 'number') {
    return Math.round(v).toString();
  }

  return v.toString();
}
