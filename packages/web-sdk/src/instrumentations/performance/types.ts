export type FaroNavigationTiming = Readonly<{
  totalNavigationTime: string;
  visibilityState: DocumentVisibilityState;
  domProcessingTime: string;
  pageLoadTime: string;
  domContentLoadHandlerTime: string;
  onLoadTime: string;
  ttfb: string;
  type: NavigationTimingType;
}>;

export type FaroResourceTiming = Readonly<{
  name: string;
  protocol: string;
  tcpHandshakeTime: string;
  dnsLookupTime: string;
  tlsNegotiationTime: string;
  redirectTime: string;
  requestTime: string;
  fetchTime: string;
  responseTime: string;
  serviceWorkerTime: string;
  decodedBodySize: string;
  encodedBodySize: string;
  cacheHitStatus: 'cache' | 'conditionalFetch' | 'fullLoad';
  renderBlockingStatus: 'blocking' | 'non-blocking' | 'unknown';
  initiatorType: string;
  // serverTiming: PerformanceServerTiming[];
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

export type CacheType = 'cache' | 'conditionalFetch' | 'fullLoad';
