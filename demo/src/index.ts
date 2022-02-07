import { initializeAgent } from '@grafana/javascript-agent-core';
import getConsoleInstrumentation from '@grafana/javascript-agent-instrumentation-console';
import errorsInstrumentation from '@grafana/javascript-agent-instrumentation-errors';
import tracingInstrumentation from '@grafana/javascript-agent-instrumentation-tracing';
import webVitalsInstrumentation from '@grafana/javascript-agent-instrumentation-web-vitals';
import browserMeta from '@grafana/javascript-agent-meta-browser';
import pageMeta from '@grafana/javascript-agent-meta-page';
import getFetchTransport from '@grafana/javascript-agent-transport-fetch';

const agent = initializeAgent({
  instrumentations: [
    getConsoleInstrumentation(),
    errorsInstrumentation,
    tracingInstrumentation,
    webVitalsInstrumentation,
  ],
  meta: [browserMeta, pageMeta],
  transports: [
    getConsoleInstrumentation(),
    getFetchTransport({
      url: 'http://localhost:8080/collect',
      debug: true,
      requestOptions: {
        headers: { 'x-api-key': 'my-api-key' },
      },
    }),
  ],
});

agent.api.pushLog(['Manual event from initialized agent']);
