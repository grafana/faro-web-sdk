import type { TraceContext } from '@grafana/faro-core';

context('Tracing', () => {
  [
    {
      title: 'log with trace context',
      btnName: 'trace-with-log',
      interceptor: () => {
        let trace: TraceContext | undefined = undefined;

        cy.interceptCollector((body) => {
          const logItem = body.logs?.[0];

          if (!trace && logItem && logItem.message === 'trace with log button clicked') {
            trace = logItem.trace;
          }

          const traceItem = body.traces;

          if (trace && traceItem) {
            const spans =
              traceItem.resourceSpans?.flatMap((resourceSpan) =>
                resourceSpan.scopeSpans.flatMap((scopeSpan) => scopeSpan.spans!)
              ) ?? [];

            if (!!spans.find((span) => span.traceId === trace!['trace_id'] && span.spanId === trace!['span_id'])!!) {
              return 'trace';
            }
          }

          return undefined;
        });
      },
    },
  ].forEach(({ title, btnName, interceptor }) => {
    it(`will capture ${title}`, () => {
      interceptor();

      cy.visit('/features');

      cy.clickButton(`btn-${btnName}`);

      cy.wait('@trace');
    });
  });
});
