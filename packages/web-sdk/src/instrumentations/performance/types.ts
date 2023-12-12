export type FaroNavigationTiming = Readonly<{
  // the complete time it took from the start of the navigation till loadEventEnd
  totalNavigationTime: string;
  // was the page hidden or visible during load
  visibilityState: DocumentVisibilityState;
  // HTML processing time: The parsing of the initial HTML document. This has mostly only relevance for big initial HTML documents
  documentProcessingDuration: string;
  // HTML document has been completely parsed, and all deferred scripts (<script defer src="…"> and <script type="module">) have downloaded and executed.
  pagLoadTime: string;
  // JS processing duration: Duration for fetching and executing all deferred scripts. The duration should be kept at <= 50ms
  scriptProcessingDuration: string;
  // Page resources processing duration (children): How long it took to load/parse/render all dependent resources of the page
  pageChildrenProcessingDuration: string;
  ttfb: string;
}>;

export type FaroResourceTiming = Readonly<{
  // Measuring TCP handshake time (connectEnd - connectStart)
  tcpHandshakeTime: string;
  // DNS lookup time (domainLookupEnd - domainLookupStart)
  dnsLookupTime: string;
  // Measuring TLS negotiation time (requestStart - secureConnectionStart)
  tlsNegotiationTime: string;
  // Measuring redirection time (redirectEnd - redirectStart)
  redirectLookupTime: string;
  // Measuring request time (responseStart - requestStart)
  requestTime: string;
  // Measuring time to fetch (without redirects) (responseEnd - fetchStart)
  fetchTime: string;
  // Measuring ServiceWorker processing time (fetchStart - workerStart)
  serviceWorkerProcessingTime: string;
  // Checking if content was compressed (decodedBodySize should not be encodedBodySize)
  isCompressed: string;
  // decodedBodySize: String(resourceEntryRaw.encodedBodySize),
  // unCompressedBodySize: String(resourceEntryRaw.decodedBodySize),
  // Checking if local caches were hit (transferSize should be 0)
  isCacheHit: string;
  // Checking if the correct resources are render-blocking (renderBlockingStatus)
  renderBlocking: any;
  // Checking if modern and fast protocols are used (nextHopProtocol should be HTTP/2 or HTTP/3)
  protocol: any;
  // 304 Not Modified
  is304: string;
}>;
