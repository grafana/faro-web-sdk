import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { initializeAgent, getWebInstrumentations } from '@grafana/agent-web';

const agent = initializeAgent({
  url: 'http://localhost:12345/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

agent.api
  .getOTEL()!
  .trace.getTracer('frontend')
  .startActiveSpan('hello world', (span) => {
    console.info('hello world!!');
    span.end();
  });
