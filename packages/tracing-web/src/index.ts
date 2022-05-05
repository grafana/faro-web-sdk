import { agent, VERSION } from '@grafana/agent-core';
import type { Instrumentation } from '@grafana/agent-core';

export class TracingInstrumentation implements Instrumentation {
  readonly name = '@grafana/agent-tracing-web:instrumentation';
  readonly version = VERSION;

  initialize(): void {
    agent.api.pushLog(['A simple log from the tracing instrumentation package']);
  }
}
