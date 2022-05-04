import { agent, VERSION } from '@grafana/agent-core';
import type { Instrumentation } from '@grafana/agent-core';

export const tracingInstrumentation: Instrumentation = {
  initialize: () => {
    agent.api.pushLog(['A simple log from the tracing instrumentation package']);
  },
  name: '@grafana/agent-tracing-web-instrumentation',
  version: VERSION,
};
