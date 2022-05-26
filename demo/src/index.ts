import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { ConsoleInstrumentation, initializeAgent, getDefaultInstrumentations } from '@grafana/agent-web';

const agent = initializeAgent({
  url: 'http://localhost:12345/collect',
  apiKey: 'secret',
  instrumentations: [...getDefaultInstrumentations(), new TracingInstrumentation(), new ConsoleInstrumentation()],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

agent.api.getOTEL()!.trace.getTracer('frontend').startActiveSpan('hello world', span => {
  console.log('hello world!!');
  span.end()
});
