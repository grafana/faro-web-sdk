// the values of this timings are contrived for testing.They do not necessarily reflect reality.
export const performanceNavigationEntry = {
  name: 'http://example.com',
  entryType: 'navigation',
  startTime: 0,
  duration: 2700,
  initiatorType: 'navigation',
  nextHopProtocol: 'h2',
  workerStart: 0,
  redirectStart: 1,
  redirectEnd: 2,
  fetchStart: 237,
  domainLookupStart: 241,
  domainLookupEnd: 380,
  connectStart: 380,
  connectEnd: 433,
  secureConnectionStart: 400,
  requestStart: 433,
  responseStart: 542,
  responseStatus: 200,
  responseEnd: 542,
  transferSize: 127601,
  encodedBodySize: 126111,
  decodedBodySize: 530675,
  serverTiming: [
    {
      name: 'traceparent',
      duration: 0,
      description: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    },
  ],
  unloadEventStart: 0,
  unloadEventEnd: 0,
  domInteractive: 1247,
  domContentLoadedEventStart: 1247,
  domContentLoadedEventEnd: 1250,
  domComplete: 2678,
  loadEventStart: 2678,
  loadEventEnd: 2700,
  type: 'navigate',
  redirectCount: 0,
} as unknown as PerformanceNavigationTiming;

export const performanceResourceEntry = {
  name: 'http://example.com/awesome-image',
  entryType: 'resource',
  startTime: 778,
  duration: 370,
  initiatorType: 'img',
  nextHopProtocol: 'h2',
  workerStart: 0,
  redirectStart: 0,
  redirectEnd: 0,
  fetchStart: 778,
  domainLookupStart: 778,
  domainLookupEnd: 778,
  connectStart: 778,
  connectEnd: 778,
  secureConnectionStart: 778,
  requestStart: 789,
  responseStart: 1148,
  responseStatus: '200',
  responseEnd: 1148,
  transferSize: 11459,
  encodedBodySize: 10526,
  decodedBodySize: 10526,
  serverTiming: [
    {
      name: 'traceparent',
      duration: 0,
      description: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    },
    {
      name: 'foo',
      duration: 0,
      description: 'bar',
    },
  ],
} as unknown as PerformanceResourceTiming;

export const analyticsEntry1 = {
  name: 'http://example.com/foo-analytics',
} as unknown as PerformanceResourceTiming;

export const analyticsEntry2 = {
  name: 'http://analytics.com/beacon',
} as unknown as PerformanceResourceTiming;
