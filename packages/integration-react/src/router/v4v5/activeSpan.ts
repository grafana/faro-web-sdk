import type { Span } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

import { globalObject, VERSION } from '@grafana/agent-web';

import { agent } from './dependencies';

export let activeSpan: Span | undefined;

export function createNewActiveSpan(): Span {
  const otel = agent.api.getOTEL()!;
  const tracer = otel.trace.getTracer('@grafana/agent-integration-react', VERSION)!;

  const span = tracer.startSpan('routeChange', {
    attributes: {
      [SemanticAttributes.HTTP_URL]: globalObject.location?.href,
    },
  });

  otel.trace.setSpan(otel.context.active(), span);

  activeSpan = span;

  return span;
}

export function setHttpRouteAttribute(value: string): void {
  activeSpan?.setAttribute(SemanticAttributes.HTTP_ROUTE, value);
}
