import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { initializeGrafanaAgent, getWebInstrumentations } from '@grafana/agent-web';

initializeGrafanaAgent({
  url: 'http://localhost:12345/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
