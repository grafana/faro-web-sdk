import { SpanStatusCode } from '@opentelemetry/api';
import { Button, ButtonGroup } from 'react-bootstrap';

import { UserActionImportance } from '@grafana/faro-core';
import { faro } from '@grafana/faro-react';

export function TracingInstrumentation() {
  const fetchSuccess = () => {
    // Override the user action creation
    faro.api.startUserAction(
      'fetch-success',
      {},
      {
        importance: UserActionImportance.Critical,
      }
    );
    fetch('/');
  };

  const xhrSuccess = () => {
    faro.api.startUserAction('xhr-success', undefined, {
      importance: UserActionImportance.Critical,
      triggerName: 'foo',
    });
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
        <Button data-cy="btn-fetch-success" onClick={fetchSuccess}>
          Fetch Success
        </Button>
        <Button data-cy="btn-xhr-success" onClick={xhrSuccess}>
          XHR Success
        </Button>
        <Button data-cy="btn-trace-with-log" onClick={traceWithLog} data-faro-user-action-name="trace-with-log">
          Trace with Log
        </Button>
      </ButtonGroup>
    </>
  );
}
