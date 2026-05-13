// This file runs inside a Web Worker (blob URL).
// It MUST be self-contained — no imports from the main module graph.
// At build time, it is compiled to JS and inlined as a string by scripts/build-worker.mjs.

interface TransportItem {
  type: string;
  meta: Record<string, unknown>;
  payload: unknown;
}

interface ResourceSpans {
  scopeSpans?: unknown[];
  [key: string]: unknown;
}

interface Traces {
  resourceSpans?: ResourceSpans[];
}

interface TransportBody {
  meta: Record<string, unknown>;
  [key: string]: unknown;
}

interface WorkerSendMessage {
  type: 'send';
  id: number;
  items: TransportItem[];
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  sessionId?: string;
  requestOptions?: RequestInit;
  rateLimitBackoffMs?: number;
}

const TRANSPORT_ITEM_TYPE = {
  EXCEPTION: 'exception',
  LOG: 'log',
  MEASUREMENT: 'measurement',
  TRACE: 'trace',
  EVENT: 'event',
} as const;

const transportItemTypeToBodyKey: Record<string, string> = {
  [TRANSPORT_ITEM_TYPE.EXCEPTION]: 'exceptions',
  [TRANSPORT_ITEM_TYPE.LOG]: 'logs',
  [TRANSPORT_ITEM_TYPE.MEASUREMENT]: 'measurements',
  [TRANSPORT_ITEM_TYPE.TRACE]: 'traces',
  [TRANSPORT_ITEM_TYPE.EVENT]: 'events',
};

function mergeResourceSpans(
  traces: Traces | undefined,
  resourceSpans: ResourceSpans[] | undefined
): Traces | undefined {
  if (resourceSpans === undefined) {
    return traces;
  }
  if (traces === undefined) {
    return { resourceSpans };
  }
  const currentResource = traces.resourceSpans?.[0];
  if (currentResource === undefined) {
    return traces;
  }
  const currentSpans = currentResource.scopeSpans ?? [];
  const newSpans = resourceSpans[0]?.scopeSpans ?? [];
  return {
    resourceSpans: [{ ...currentResource, scopeSpans: [...currentSpans, ...newSpans] }],
  };
}

function getTransportBody(items: TransportItem[]): TransportBody {
  const body: TransportBody = { meta: {} };
  if (items[0] !== undefined) {
    body.meta = items[0].meta;
  }
  for (const item of items) {
    const { type } = item;
    if (
      type === TRANSPORT_ITEM_TYPE.LOG ||
      type === TRANSPORT_ITEM_TYPE.EVENT ||
      type === TRANSPORT_ITEM_TYPE.EXCEPTION ||
      type === TRANSPORT_ITEM_TYPE.MEASUREMENT
    ) {
      const bk = transportItemTypeToBodyKey[type]!;
      const signals = body[bk] as unknown[] | undefined;
      body[bk] = signals === undefined ? [item.payload] : [...signals, item.payload];
    } else if (type === TRANSPORT_ITEM_TYPE.TRACE) {
      body['traces'] = mergeResourceSpans(
        body['traces'] as Traces | undefined,
        (item.payload as { resourceSpans?: ResourceSpans[] }).resourceSpans
      );
    }
  }
  return body;
}

const BEACON_BODY_SIZE_LIMIT = 60000;
const TOO_MANY_REQUESTS = 429;
const ACCEPTED = 202;

let disabledUntil = 0;

function getRetryAfterTimestamp(headers: Headers, now: number, defaultBackoffMs: number): number {
  const retryAfter = headers.get('Retry-After');
  if (retryAfter) {
    const delay = Number(retryAfter);
    if (!isNaN(delay)) {
      return delay * 1000 + now;
    }
    const date = Date.parse(retryAfter);
    if (!isNaN(date)) {
      return date;
    }
  }
  return now + defaultBackoffMs;
}

self.onmessage = (e: MessageEvent<WorkerSendMessage>) => {
  const msg = e.data;
  if (msg.type !== 'send') {
    return;
  }

  const { id } = msg;
  const now = Date.now();

  if (disabledUntil > now) {
    self.postMessage({ type: 'rate-limited', id, disabledUntil });
    return;
  }

  let body: string;
  try {
    body = JSON.stringify(getTransportBody(msg.items));
  } catch (err) {
    self.postMessage({ type: 'send-error', id, error: 'Serialization failed: ' + String(err) });
    return;
  }

  const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (msg.headers) {
    for (const key of Object.keys(msg.headers)) {
      fetchHeaders[key] = msg.headers[key]!;
    }
  }
  if (msg.apiKey) {
    fetchHeaders['x-api-key'] = msg.apiKey;
  }
  if (msg.sessionId) {
    fetchHeaders['x-faro-session-id'] = msg.sessionId;
  }

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: fetchHeaders,
    body,
    keepalive: body.length <= BEACON_BODY_SIZE_LIMIT,
    ...msg.requestOptions,
  };

  fetch(msg.url, fetchOptions)
    .then((response) => {
      let sessionExpired = false;

      if (response.status === ACCEPTED) {
        sessionExpired = response.headers.get('X-Faro-Session-Status') === 'invalid';
      }

      if (response.status === TOO_MANY_REQUESTS) {
        disabledUntil = getRetryAfterTimestamp(response.headers, Date.now(), msg.rateLimitBackoffMs ?? 5000);
        self.postMessage({ type: 'rate-limited', id, disabledUntil });
        response.text().catch(() => {});
        return;
      }

      response.text().catch(() => {});
      self.postMessage({ type: 'send-result', id, sessionExpired });
    })
    .catch((err) => {
      self.postMessage({ type: 'send-error', id, error: String(err) });
    });
};
