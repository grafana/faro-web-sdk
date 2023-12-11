import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { RESOURCE_ENTRY } from './performanceConstants';
import { entryUrlIsIgnored } from './util';

export function observeResourceTimings(
  parentNavigationEntry: { faroNavigationId: string },
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>
) {
  const observer = new PerformanceObserver((observedEntries) => {
    const entries = observedEntries.getEntries();

    for (const resourceEntryRaw of entries) {
      const name = resourceEntryRaw.name;

      if (entryUrlIsIgnored(ignoredUrls, name)) {
        return;
      }

      const faroResourceEntry = {
        ...calculateResourceTimings(resourceEntryRaw.toJSON()),
        faroNavigationId: parentNavigationEntry.faroNavigationId,
        faroResourceId: genShortID(),
      };

      console.log('faroResourceEntry :>> ', faroResourceEntry);

      // pushEvent('faro.performance.resource', objectValuesToString(faroResourceEntry));
      pushEvent('faro.performance.resource', faroResourceEntry);
    }
  });

  observer.observe({
    type: RESOURCE_ENTRY,
    buffered: true,
  });
}

function calculateResourceTimings(resourceEntryRaw: any) {
  // console.log('resourceEntryRaw :>> ', resourceEntryRaw);
  return {
    // Measuring TCP handshake time (connectEnd - connectStart)
    tcpHandshakeTime: String(resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart),
    // DNS lookup time (domainLookupEnd - domainLookupStart)
    dnsLookupTime: String(resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart),
    // Measuring redirection time (redirectEnd - redirectStart)
    redirectLookupTime: String(resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart),
    // Measuring interim request time (firstInterimResponseStart - requestStart)
    interimRequestTime: String(resourceEntryRaw.firstInterimResponseStart - resourceEntryRaw.requestStart),
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
