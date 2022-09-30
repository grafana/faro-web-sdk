import { SpanStatusCode } from '@opentelemetry/api';

import { agent, isString } from '@grafana/agent-integration-react';

import { fetchBaseQuery } from '../utils';

export const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  fetchFn: (input, init) => {
    const url = isString(input) ? input : input.url;

    const otel = agent.api.getOTEL();

    if (otel) {
      const tracer = otel.trace.getTracer('default');
      let span = otel.trace.getActiveSpan() ?? tracer.startSpan('http-request');

      return new Promise((resolve, reject) => {
        otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
          agent.api.pushEvent('Sending request', { url });

          fetch(input, init)
            .then((response) => {
              agent.api.pushEvent('Request completed', { url });

              span.setStatus({ code: SpanStatusCode.OK });

              resolve(response);
            })
            .catch((err) => {
              agent.api.pushEvent('Request failed', { url });

              span.setStatus({ code: SpanStatusCode.ERROR });

              reject(err);
            })
            .finally(() => {
              span.end();
            });
        });
      });
    }

    agent.api.pushEvent('Sending request', { url });

    return fetch(input, init)
      .then((response) => {
        agent.api.pushEvent('Request completed', { url });

        return response;
      })
      .catch((err) => {
        agent.api.pushEvent('Request failed', { url });

        throw err;
      });
  },
});
