import '@grafana/agent-web/build/cjs/globals';
import { SpanStatusCode } from '@opentelemetry/api';

const w = window as any;

w.throwError = () => {
  throw new Error('This is a thrown error');
};

w.callUndefined = () => {
  // eslint-disable-next-line no-eval
  eval('test();');
};

w.callConsole = (method: 'trace' | 'info' | 'log' | 'warn' | 'error') => {
  // eslint-disable-next-line no-console
  console[method](`This is a console ${method} message`);
};

w.fetchError = () => {
  fetch('http://localhost:12345', {
    method: 'POST',
  });
};

w.promiseReject = () => {
  new Promise((_accept, reject) => {
    reject('This is a rejected promise');
  });
};

w.fetchSuccess = () => {
  fetch('http://localhost:1234');
};

w.sendCustomMetric = () => {
  window.grafanaAgent.api.pushMeasurement({
    type: 'custom',
    values: {
      my_custom_metric: Math.random(),
    },
  });
};

w.traceWithLog = () => {
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

window.addEventListener('load', () => {
  window.grafanaAgent.api.pushLog(['Manual event from Home']);
});
