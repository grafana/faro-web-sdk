export type FaroNavigationTiming = Readonly<{
  // the complete time it took from the start of the navigation till loadEventEnd
  totalNavigationTime: number;
  // was the page hidden or visible during load
  visibilityState: DocumentVisibilityState;
  // HTML processing time: The parsing of the initial HTML document. This has mostly only relevance for big initial HTML documents
  documentProcessingDuration: number;
  // HTML document has been completely parsed, and all deferred scripts (<script defer src="…"> and <script type="module">) have downloaded and executed.
  pagLoadTime: number;
  // JS processing duration: Duration for fetching and executing all deferred scripts. The duration should be kept at <= 50ms
  scriptProcessingDuration: number;
  // Page resources processing duration (children): How long it took to load/parse/render all dependent resources of the page
  pageChildrenProcessingDuration: number;
  ttfb: number;
}>;

export type FaroResourceTiming = Readonly<{
  resourceUrl: string;
  // Checking if modern and fast protocols are used (nextHopProtocol should be HTTP/2 or HTTP/3)
  protocol: string;
  // Measuring TCP handshake time (connectEnd - connectStart)
  tcpHandshakeTime: number;
  // DNS lookup time (domainLookupEnd - domainLookupStart)
  dnsLookupTime: number;
  // Measuring TLS negotiation time (requestStart - secureConnectionStart)
  tlsNegotiationTime: number;
  // Measuring redirection time (redirectEnd - redirectStart)
  redirectLookupTime: number;
  // Measuring request time (responseStart - requestStart)
  requestTime: number;
  // Measuring time to fetch (without redirects) (responseEnd - fetchStart)
  fetchTime: number;
  // Measuring ServiceWorker processing time (fetchStart - workerStart)
  serviceWorkerProcessingTime: number;
  // Checking if content was compressed (decodedBodySize should not be encodedBodySize)
  isCompressed: boolean;
  // decodedBodySize: String(resourceEntryRaw.encodedBodySize),
  // unCompressedBodySize: String(resourceEntryRaw.decodedBodySize),
  // Checking if local caches were hit (transferSize should be 0)
  isCacheHit: boolean;
  // Checking if the correct resources are render-blocking (renderBlockingStatus)
  renderBlocking: 'blocking' | 'non-blocking' | 'unknown';
  // 304 Not Modified
  is304: boolean;
}>;
// export type FaroNavigationTiming = Readonly<{
//   resourceUrl: string;
//   // the complete time it took from the start of the navigation till loadEventEnd
//   totalNavigationTime: string;
//   // was the page hidden or visible during load
//   visibilityState: DocumentVisibilityState;
//   // HTML processing time: The parsing of the initial HTML document. This has mostly only relevance for big initial HTML documents
//   documentProcessingDuration: string;
//   // HTML document has been completely parsed, and all deferred scripts (<script defer src="…"> and <script type="module">) have downloaded and executed.
//   pagLoadTime: string;
//   // JS processing duration: Duration for fetching and executing all deferred scripts. The duration should be kept at <= 50ms
//   scriptProcessingDuration: string;
//   // Page resources processing duration (children): How long it took to load/parse/render all dependent resources of the page
//   pageChildrenProcessingDuration: string;
//   ttfb: string;
// }>;

// export type FaroResourceTiming = Readonly<{
//   resourceUrl: string;
//   // Measuring TCP handshake time (connectEnd - connectStart)
//   tcpHandshakeTime: string;
//   // DNS lookup time (domainLookupEnd - domainLookupStart)
//   dnsLookupTime: string;
//   // Measuring TLS negotiation time (requestStart - secureConnectionStart)
//   tlsNegotiationTime: string;
//   // Measuring redirection time (redirectEnd - redirectStart)
//   redirectLookupTime: string;
//   // Measuring request time (responseStart - requestStart)
//   requestTime: string;
//   // Measuring time to fetch (without redirects) (responseEnd - fetchStart)
//   fetchTime: string;
//   // Measuring ServiceWorker processing time (fetchStart - workerStart)
//   serviceWorkerProcessingTime: string;
//   // Checking if content was compressed (decodedBodySize should not be encodedBodySize)
//   isCompressed: string;
//   // decodedBodySize: String(resourceEntryRaw.encodedBodySize),
//   // unCompressedBodySize: String(resourceEntryRaw.decodedBodySize),
//   // Checking if local caches were hit (transferSize should be 0)
//   isCacheHit: string;
//   // Checking if the correct resources are render-blocking (renderBlockingStatus)
//   renderBlocking: 'blocking' | 'non-blocking' | 'unknown';
//   // Checking if modern and fast protocols are used (nextHopProtocol should be HTTP/2 or HTTP/3)
//   protocol: string;
//   // 304 Not Modified
//   is304: string;
// }>;

export type FaroNavigationEntry = {
  faroNavigationId: string;
  faroPreviousNavigationId?: string;
} & FaroNavigationTiming &
  FaroResourceTiming;

export type FaroResourceEntry = {
  faroNavigationId: string;
  faroResourceId: string;
} & FaroResourceTiming;
