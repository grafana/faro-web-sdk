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
  // DOM Load Time: How long it takes to load/parse/render all dependent resources of the page
  domLoadTime: string;
  ttfb: string;
  type: NavigationTimingType;
}>;

export type FaroResourceTiming = Readonly<{
  name: string;
  // Checking if modern and fast protocols are used (nextHopProtocol should be HTTP/2 or HTTP/3)
  protocol: string;
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
  //For example: Checking if content was compressed (decodedBodySize !== encodedBodySize)
  decodedBodySize: string;
  unCompressedBodySize: string;
  // Checking if local caches were hit (transferSize should be 0)
  isCacheHit: string;
  // Checking if the correct resources are render-blocking (renderBlockingStatus)
  renderBlockingStatus: 'blocking' | 'non-blocking' | 'unknown';
  initiatorType: string;
  // serverTiming: PerformanceServerTiming[];
  documentReadyState: DocumentReadyState;
}>;

export type FaroNavigationItem = {
  faroNavigationId: string;
  faroPreviousNavigationId: string;
} & FaroNavigationTiming &
  FaroResourceTiming;

export type FaroResourceItem = {
  faroNavigationId: string;
  faroResourceId: string;
} & FaroResourceTiming;
