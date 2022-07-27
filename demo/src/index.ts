import { InternalLoggerLevel } from '@grafana/agent-core';
import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { initializeGrafanaAgent, getWebInstrumentations } from '@grafana/agent-web';

initializeGrafanaAgent({
  url: '/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
  internalLoggerLevel: InternalLoggerLevel.VERBOSE,
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
