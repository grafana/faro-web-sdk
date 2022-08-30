import { InternalLoggerLevel } from '@grafana/agent-core';
import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { getWebInstrumentations, initializeGrafanaAgent } from '@grafana/agent-web';

initializeGrafanaAgent({
  isolate: true,
  url: '/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
  internalLoggerLevel: InternalLoggerLevel.VERBOSE,
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
