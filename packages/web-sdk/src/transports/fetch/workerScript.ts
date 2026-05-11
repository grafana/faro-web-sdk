export function getWorkerScript(): string {
  // Worker script is plain JavaScript — no imports, no TypeScript.
  // Duplicates getTransportBody and mergeResourceSpans from @grafana/faro-core
  // because the worker can't import from the main thread's module graph.
  return `
'use strict';

var TransportItemType = {
  EXCEPTION: 'exception',
  LOG: 'log',
  MEASUREMENT: 'measurement',
  TRACE: 'trace',
  EVENT: 'event',
};

var transportItemTypeToBodyKey = {};
transportItemTypeToBodyKey[TransportItemType.EXCEPTION] = 'exceptions';
transportItemTypeToBodyKey[TransportItemType.LOG] = 'logs';
transportItemTypeToBodyKey[TransportItemType.MEASUREMENT] = 'measurements';
transportItemTypeToBodyKey[TransportItemType.TRACE] = 'traces';
transportItemTypeToBodyKey[TransportItemType.EVENT] = 'events';

function mergeResourceSpans(traces, resourceSpans) {
  if (resourceSpans === undefined) {
    return traces;
  }
  if (traces === undefined) {
    return { resourceSpans: resourceSpans };
  }
  var currentResource = traces.resourceSpans && traces.resourceSpans[0];
  if (currentResource === undefined) {
    return traces;
  }
  var currentSpans = currentResource.scopeSpans || [];
  var newSpans = (resourceSpans[0] && resourceSpans[0].scopeSpans) || [];
  return {
    resourceSpans: [
      Object.assign({}, currentResource, {
        scopeSpans: currentSpans.concat(newSpans),
      }),
    ],
  };
}

function getTransportBody(items) {
  var body = { meta: {} };
  if (items[0] !== undefined) {
    body.meta = items[0].meta;
  }
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var type = item.type;
    if (
      type === TransportItemType.LOG ||
      type === TransportItemType.EVENT ||
      type === TransportItemType.EXCEPTION ||
      type === TransportItemType.MEASUREMENT
    ) {
      var bk = transportItemTypeToBodyKey[type];
      var signals = body[bk];
      body[bk] = signals === undefined ? [item.payload] : signals.concat([item.payload]);
    } else if (type === TransportItemType.TRACE) {
      body.traces = mergeResourceSpans(body.traces, item.payload.resourceSpans);
    }
  }
  return body;
}

var BEACON_BODY_SIZE_LIMIT = 60000;
var TOO_MANY_REQUESTS = 429;
var ACCEPTED = 202;

var disabledUntil = 0;

function getRetryAfterTimestamp(headers, now, defaultBackoffMs) {
  var retryAfter = headers.get('Retry-After');
  if (retryAfter) {
    var delay = Number(retryAfter);
    if (!isNaN(delay)) {
      return delay * 1000 + now;
    }
    var date = Date.parse(retryAfter);
    if (!isNaN(date)) {
      return date;
    }
  }
  return now + defaultBackoffMs;
}

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.type !== 'send') {
    return;
  }

  var id = msg.id;
  var now = Date.now();

  if (disabledUntil > now) {
    self.postMessage({ type: 'rate-limited', id: id, disabledUntil: disabledUntil });
    return;
  }

  var body;
  try {
    body = JSON.stringify(getTransportBody(msg.items));
  } catch (err) {
    self.postMessage({ type: 'send-error', id: id, error: 'Serialization failed: ' + String(err) });
    return;
  }

  var fetchHeaders = { 'Content-Type': 'application/json' };
  var msgHeaders = msg.headers;
  if (msgHeaders) {
    for (var key in msgHeaders) {
      if (Object.prototype.hasOwnProperty.call(msgHeaders, key)) {
        fetchHeaders[key] = msgHeaders[key];
      }
    }
  }
  if (msg.apiKey) {
    fetchHeaders['x-api-key'] = msg.apiKey;
  }
  if (msg.sessionId) {
    fetchHeaders['x-faro-session-id'] = msg.sessionId;
  }

  var fetchOptions = Object.assign(
    {
      method: 'POST',
      headers: fetchHeaders,
      body: body,
      keepalive: body.length <= BEACON_BODY_SIZE_LIMIT,
    },
    msg.requestOptions || {}
  );

  fetch(msg.url, fetchOptions)
    .then(function (response) {
      var sessionExpired = false;

      if (response.status === ACCEPTED) {
        sessionExpired = response.headers.get('X-Faro-Session-Status') === 'invalid';
      }

      if (response.status === TOO_MANY_REQUESTS) {
        disabledUntil = getRetryAfterTimestamp(response.headers, Date.now(), msg.rateLimitBackoffMs || 5000);
        self.postMessage({ type: 'rate-limited', id: id, disabledUntil: disabledUntil });
        response.text().catch(function () {});
        return;
      }

      response.text().catch(function () {});
      self.postMessage({ type: 'send-result', id: id, sessionExpired: sessionExpired });
    })
    .catch(function (err) {
      self.postMessage({ type: 'send-error', id: id, error: String(err) });
    });
};
`;
}
