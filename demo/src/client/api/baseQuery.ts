import { SpanStatusCode } from '@opentelemetry/api';

import { agent, isString } from '@grafana/faro-react';

import { fetchBaseQuery } from '../utils';

export const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  fetchFn: (input, init) => {
    const url = isString(input) ? input : (input as Request).url;

    const otel = agent.api.getOTEL();

    if (otel) {
      const tracer = otel.trace.getTracer('default');
      let span = otel.trace.getActiveSpan() ?? tracer.startSpan('http-request');

      return new Promise((resolve, reject) => {
        otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
          agent.api.pushEvent('Sending request', { url });

          fetch(input, init)
            .then(async (response) => {
              if (!response.ok) {
                const body = await response.clone().json();

                agent.api.pushEvent('Request failed', { url });

                const error = new Error(body.data.message);
                error.cause = response;

                agent.api.pushError(error);

                span.setStatus({ code: SpanStatusCode.ERROR });
              } else {
                agent.api.pushEvent('Request completed', { url });

                span.setStatus({ code: SpanStatusCode.OK });
              }

              resolve(response);
            })
            .catch((err) => {
              agent.api.pushEvent('Request failed', { url });

              agent.api.pushError(err);

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
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.clone().json();

          agent.api.pushEvent('Request failed', { url });

          const error = new Error(body.data.message);
          error.cause = response;

          agent.api.pushError(error);
        } else {
          agent.api.pushEvent('Request completed', { url });
        }

        return response;
      })
      .catch((err) => {
        agent.api.pushEvent('Request failed', { url });

        agent.api.pushError(err);

        throw err;
      });
  },
});
