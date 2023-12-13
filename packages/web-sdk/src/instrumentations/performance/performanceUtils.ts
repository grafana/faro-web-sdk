import type { FaroNavigationEntry, FaroNavigationTiming, FaroResourceEntry, FaroResourceTiming } from './types';

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
    name: resourceEntryRaw.name,
    tcpHandshakeTime: resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart,
    dnsLookupTime: resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart,
    tlsNegotiationTime: resourceEntryRaw.requestStart - resourceEntryRaw.secureConnectionStart,
    redirectLookupTime: resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart,
    requestTime: resourceEntryRaw.responseStart - resourceEntryRaw.requestStart,
    fetchTime: resourceEntryRaw.responseEnd - resourceEntryRaw.fetchStart,
    serviceWorkerProcessingTime: resourceEntryRaw.fetchStart - resourceEntryRaw.workerStart,
    isCompressed: resourceEntryRaw.decodedBodySize !== resourceEntryRaw.encodedBodySize,
    // decodedBodySize: String(resourceEntryRaw.encodedBodySize),
    // unCompressedBodySize: String(resourceEntryRaw.decodedBodySize),
    isCacheHit: resourceEntryRaw.transferSize === 0,
    renderBlocking: resourceEntryRaw.renderBlockingStatus ?? 'unknown',
    protocol: resourceEntryRaw.nextHopProtocol,
    is304:
      resourceEntryRaw.encodedBodySize > 0 &&
      resourceEntryRaw.transferSize > 0 &&
      resourceEntryRaw.transferSize < resourceEntryRaw.encodedBodySize,
  };
}

export function calculateNavigationTimings(navigationEntryRaw: any): FaroNavigationTiming {
  return {
    totalNavigationTime: navigationEntryRaw.duration,
    visibilityState: document.visibilityState,
    documentProcessingDuration: navigationEntryRaw.loadEventEnd - navigationEntryRaw.responseEnd,
    pagLoadTime: navigationEntryRaw.domContentLoadedEventStart - navigationEntryRaw.fetchStart,
    scriptProcessingDuration:
      navigationEntryRaw.domContentLoadedEventEnd - navigationEntryRaw.domContentLoadedEventStart,
    pageChildrenProcessingDuration: navigationEntryRaw.loadEventEnd - navigationEntryRaw.domContentLoadedEventEnd,
    ttfb: navigationEntryRaw.responseStart - navigationEntryRaw.fetchStart,
  };
}

// export function calculateResourceTimings(resourceEntryRaw: any): FaroResourceTiming {
//   return {
//     tcpHandshakeTime: String(resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart),
//     dnsLookupTime: String(resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart),
//     tlsNegotiationTime: String(resourceEntryRaw.requestStart - resourceEntryRaw.secureConnectionStart),
//     redirectLookupTime: String(resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart),
//     requestTime: String(resourceEntryRaw.responseStart - resourceEntryRaw.requestStart),
//     fetchTime: String(resourceEntryRaw.responseEnd - resourceEntryRaw.fetchStart),
//     serviceWorkerProcessingTime: String(resourceEntryRaw.fetchStart - resourceEntryRaw.workerStart),
//     isCompressed: String(resourceEntryRaw.decodedBodySize !== resourceEntryRaw.encodedBodySize),
//     // decodedBodySize: String(resourceEntryRaw.encodedBodySize),
//     // unCompressedBodySize: String(resourceEntryRaw.decodedBodySize),
//     isCacheHit: String(resourceEntryRaw.transferSize === 0),
//     renderBlocking: resourceEntryRaw.renderBlockingStatus ?? 'unknown',
//     protocol: resourceEntryRaw.nextHopProtocol,
//     is304: String(
//       resourceEntryRaw.encodedBodySize > 0 &&
//         resourceEntryRaw.transferSize > 0 &&
//         resourceEntryRaw.transferSize < resourceEntryRaw.encodedBodySize
//     ),
//   };
// }

// export function calculateNavigationTimings(navigationEntryRaw: any): FaroNavigationTiming {
//   return {
//     totalNavigationTime: String(navigationEntryRaw.duration),
//     visibilityState: document.visibilityState,
//     documentProcessingDuration: String(navigationEntryRaw.loadEventEnd - navigationEntryRaw.responseEnd),
//     pagLoadTime: String(navigationEntryRaw.domContentLoadedEventStart - navigationEntryRaw.fetchStart),
//     scriptProcessingDuration: String(
//       navigationEntryRaw.domContentLoadedEventEnd - navigationEntryRaw.domContentLoadedEventStart
//     ),
//     pageChildrenProcessingDuration: String(
//       navigationEntryRaw.loadEventEnd - navigationEntryRaw.domContentLoadedEventEnd
//     ),
//     ttfb: String(navigationEntryRaw.responseStart - navigationEntryRaw.fetchStart),
//   };
// }

export function compressFaroResourceEntry(entry: FaroResourceEntry): Record<string, string> {
  const values = [
    entry.faroNavigationId,
    // entry.name, // name is redundant in proposal 2
    entry.tcpHandshakeTime,
    entry.dnsLookupTime,
    entry.tlsNegotiationTime,
    entry.redirectLookupTime,
    entry.requestTime,
    entry.fetchTime,
    entry.serviceWorkerProcessingTime,
    entry.isCompressed,
    entry.isCacheHit,
    entry.renderBlocking,
    entry.protocol,
    entry.is304,
  ];

  const dropSubMillisecondAccuracy = values.map((v) => {
    if (typeof v !== 'number') {
      return v;
    }

    return Math.ceil(v);
  });

  // return { [entry.faroResourceId]: JSON.stringify(dropSubMillisecondAccuracy) };

  return {
    faroResourceId: entry.faroResourceId,
    faroNavigationId: entry.faroNavigationId,
    name: entry.name,
    metrics: JSON.stringify(dropSubMillisecondAccuracy),
  };
}

export function compressFaroNavigationEntry(entry: FaroNavigationEntry) {
  const values = [
    entry.faroPreviousNavigationId,

    // entry.name, // name is redundant in proposal 2
    // navigation specific properties
    entry.totalNavigationTime,
    entry.visibilityState,
    entry.documentProcessingDuration,
    entry.pagLoadTime,
    entry.scriptProcessingDuration,
    entry.pageChildrenProcessingDuration,
    entry.ttfb,

    // resource specific properties. Same as for resource entries
    // entry.name,
    // entry.faroNavigationId,
    entry.tcpHandshakeTime,
    entry.dnsLookupTime,
    entry.tlsNegotiationTime,
    entry.redirectLookupTime,
    entry.requestTime,
    entry.fetchTime,
    entry.serviceWorkerProcessingTime,
    entry.isCompressed,
    entry.isCacheHit,
    entry.renderBlocking,
    entry.protocol,
    entry.is304,
  ];

  const dropSubMillisecondAccuracy = values.map((v) => {
    if (typeof v !== 'number') {
      return v;
    }

    return Math.ceil(v);
  });

  // return {
  //   [entry.faroNavigationId]: JSON.stringify(dropSubMillisecondAccuracy),
  // };

  return {
    faroNavigationId: entry.faroNavigationId,
    name: entry.name,
    metrics: JSON.stringify(dropSubMillisecondAccuracy),
  };
}
