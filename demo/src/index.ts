import { initializeAgent } from '@grafana/agent-core';
import { tracingInstrumentation } from '@grafana/agent-tracing-web';
import {
  getConsoleInstrumentation,
  getConsoleTransport,
  errorsInstrumentation,
  webVitalsInstrumentation,
  browserMeta,
  pageMeta,
  getFetchTransport,
} from '@grafana/agent-web';

const agent = initializeAgent({
  instrumentations: [
    getConsoleInstrumentation(),
    errorsInstrumentation,
    tracingInstrumentation,
    webVitalsInstrumentation,
  ],
  metas: [browserMeta, pageMeta],
  transports: [
    getConsoleTransport(),
    getFetchTransport({
      url: 'http://localhost:12345/collect',
      debug: true,
      requestOptions: {
        headers: { 'x-api-key': 'my-api-key' },
      },
    }),
  ],
});

agent.api.pushLog(['Manual event from initialized agent']);
