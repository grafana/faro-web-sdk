import '@grafana/agent-web/globals';
import { SpanStatusCode } from '@opentelemetry/api';

const localWindow: any = window;

localWindow.throwError = () => {
  throw new Error('This is a thrown error');
};

localWindow.callUndefined = () => {
  // eslint-disable-next-line no-eval
  eval('test();');
};

localWindow.callConsole = (method: 'trace' | 'info' | 'log' | 'warn' | 'error') => {
  // eslint-disable-next-line no-console
  console[method](`This is a console ${method} message`);
};

localWindow.fetchError = () => {
  fetch('http://localhost:12345', {
    method: 'POST',
  });
};

localWindow.promiseReject = () => {
  new Promise((_accept, reject) => {
    reject('This is a rejected promise');
  });
};

localWindow.fetchSuccess = () => {
  fetch('http://localhost:1234');
};

localWindow.sendCustomMetric = () => {
  window.grafanaAgent.api.pushMeasurement({
    type: 'custom',
    values: {
      my_custom_metric: Math.random(),
    },
  });
};

localWindow.traceWithLog = () => {
  const otel = window.grafanaAgent.api.getOTEL();

  if (otel) {
    const span = otel.trace.getTracer('default').startSpan('trace with log');

    otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
      window.grafanaAgent.api.pushLog(['trace with log button clicked']);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    });
  }
};

localWindow.captureEvent = (name: string, attributes?: Record<string, string>) => {
  window.grafanaAgent.api.pushEvent(name, attributes);
};
