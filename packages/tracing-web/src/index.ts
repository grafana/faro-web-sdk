import { agent, VERSION } from '@grafana/agent-core';
import type { Instrumentation } from '@grafana/agent-core';

export class TracingInstrumentation implements Instrumentation {
  initialize(): void {
    agent.api.pushLog(['A simple log from the tracing instrumentation package']);
  }
  name = '@grafana/agent-tracing-web:instrumentation';
  version = VERSION;
}
