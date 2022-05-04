import { agent } from '@grafana/agent-core';
import type { Instrumentation } from '@grafana/agent-core';

export const tracingInstrumentation: Instrumentation = () => {
  agent.api.pushLog(['A simple log from the tracing instrumentation package']);
};
