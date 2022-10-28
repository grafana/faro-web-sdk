import { SpanStatusCode } from '@opentelemetry/api';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import { faro } from '@grafana/faro-react';

export function TracingInstrumentation() {
  const fetchSuccess = () => {
    fetch('/');
  };

  const traceWithLog = () => {
    const otel = faro.api.getOTEL();

    if (otel) {
      const span = otel.trace.getTracer('default').startSpan('trace with log');

      otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
        faro.api.pushLog(['trace with log button clicked']);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      });
    }
  };

  return (
    <>
      <h3>Tracing Instrumentation</h3>
      <ButtonGroup>
        <Button data-cy="btn-fetch-success" onClick={fetchSuccess}>
          Fetch Success
        </Button>
        <Button data-cy="btn-trace-with-log" onClick={traceWithLog}>
          Trace with Log
        </Button>
      </ButtonGroup>
    </>
  );
}
