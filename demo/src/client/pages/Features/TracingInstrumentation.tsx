import { SpanStatusCode } from '@opentelemetry/api';
import { Button, ButtonGroup } from 'react-bootstrap';

import { faro } from '@grafana/faro-react';

export function TracingInstrumentation() {
  const fetchSuccess = () => {
    fetch('/');
  };

  const xhrSuccess = () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/');
    xhr.send();
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
        <Button data-cy="btn-fetch-success" onClick={fetchSuccess} data-faro-user-action-name-custom="fetch-success">
          Fetch Success
        </Button>
        <Button data-cy="btn-xhr-success" onClick={xhrSuccess} data-faro-user-action-name-custom="xhr-success">
          XHR Success
        </Button>
        <Button data-cy="btn-trace-with-log" onClick={traceWithLog} data-faro-user-action-name-custom="trace-with-log">
          Trace with Log
        </Button>
      </ButtonGroup>
    </>
  );
}
