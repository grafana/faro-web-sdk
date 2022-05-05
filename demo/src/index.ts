import { initializeAgent } from '@grafana/agent-core';
import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import {
  ConsoleInstrumentation,
  ConsoleTransport,
  ErrorsInstrumentation,
  WebVitalsInstrumentation,
  browserMeta,
  pageMeta,
  FetchTransport,
} from '@grafana/agent-web';

const agent = initializeAgent({
  instrumentations: [
    new ConsoleInstrumentation(),
    new ErrorsInstrumentation(),
    new TracingInstrumentation(),
    new WebVitalsInstrumentation(),
  ],
  metas: [browserMeta, pageMeta],
  transports: [
    new ConsoleTransport(),
    new FetchTransport({
      url: 'http://localhost:12345/collect',
      debug: true,
      requestOptions: {
        headers: { 'x-api-key': 'my-api-key' },
      },
    }),
  ],
  user: {
    username: 'bob',
  },
  app: {
    name: 'demo',
    version: '1.0',
  },
});

agent.api.pushLog(['Manual event from initialized agent']);
