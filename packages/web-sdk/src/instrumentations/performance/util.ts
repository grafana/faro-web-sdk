import { isArray, isObject } from '@grafana/faro-core';

export function objectValuesToString(object: Record<string, any> = {}): Record<string, string> {
  const o: Record<string, any> = {};

  for (const [key, value] of Object.entries(object)) {
    if (isArray(value)) {
      o[key] =
        value.length === 0
          ? JSON.stringify(value)
          : String(value.map((arrayValue: any) => objectValuesToString(arrayValue)));
      continue;
    }

    if (isObject(value)) {
      o[key] = objectValuesToString(value);
      continue;
    }

    o[key] = String(value);
  }

  return o;
}

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

export function calculateResourceTimings(resourceEntryRaw: any) {
  // console.log('resourceEntryRaw :>> ', resourceEntryRaw);
  return {
    // Measuring TCP handshake time (connectEnd - connectStart)
    tcpHandshakeTime: String(resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart),
    // DNS lookup time (domainLookupEnd - domainLookupStart)
    dnsLookupTime: String(resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart),
    // Measuring redirection time (redirectEnd - redirectStart)
    redirectLookupTime: String(resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart),
    // Measuring request time (responseStart - requestStart)
    requestTime: String(resourceEntryRaw.responseStart - resourceEntryRaw.requestStart),
    // Measuring TLS negotiation time (requestStart - secureConnectionStart)
    tlsNegotiationTime: String(resourceEntryRaw.requestStart - resourceEntryRaw.secureConnectionStart),
    // Measuring time to fetch (without redirects) (responseEnd - fetchStart)
    fetchTime: String(resourceEntryRaw.responseEnd - resourceEntryRaw.fetchStart),
    // Measuring ServiceWorker processing time (fetchStart - workerStart)
    serviceWorkerProcessingTime: String(resourceEntryRaw.fetchStart - resourceEntryRaw.workerStart),
    // Checking if content was compressed (decodedBodySize should not be encodedBodySize)
    isCompressed: String(resourceEntryRaw.decodedBodySize !== resourceEntryRaw.encodedBodySize),
    // Checking if local caches were hit (transferSize should be 0)
    isCacheHit: String(resourceEntryRaw.transferSize === 0),
    // Checking if the correct resources are render-blocking (renderBlockingStatus)
    renderBlocking: resourceEntryRaw.renderBlockingStatus ?? 'not-supported-by-browser',
    // Checking if modern and fast protocols are used (nextHopProtocol should be HTTP/2 or HTTP/3)
    protocol: resourceEntryRaw.nextHopProtocol,
    // 304 Not Modified
    is304: String(
      resourceEntryRaw.encodedBodySize > 0 &&
        resourceEntryRaw.tranferSize > 0 &&
        resourceEntryRaw.tranferSize < resourceEntryRaw.encodedBodySize
    ),
  };
}

// // Measuring interim request time (firstInterimResponseStart - requestStart)
// interimRequestTime: String(resourceEntryRaw.firstInterimResponseStart - resourceEntryRaw.requestStart),
