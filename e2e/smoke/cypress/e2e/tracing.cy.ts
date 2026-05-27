import type { TransportBody } from '@grafana/faro-core';

context('Smoke / tracing', () => {
  it('exports an OTel span emitted via faro.api.getOTEL() to /collect', () => {
    // Exercises the TracingInstrumentation + FaroTraceExporter pipeline by
    // emitting a span manually. The harness button only fires if
    // faro.api.getOTEL() returns a TraceAPI — so this also verifies that
    // TracingInstrumentation initialized successfully.
    cy.interceptCollector((body: TransportBody) => {
      const hasSmokeSpan = (body.traces?.resourceSpans ?? []).some((rs) =>
        (rs.scopeSpans ?? []).some((ss) => (ss.spans ?? []).some((s) => s.name === 'smoke-harness-span'))
      );
      return hasSmokeSpan ? 'traces' : undefined;
    });

    cy.visit('/');
    cy.clickButton('btn-emit-span');

    cy.wait('@traces').then(({ request }) => {
      const body = request.body as TransportBody;
      const span = (body.traces?.resourceSpans ?? [])
        .flatMap((rs) => rs.scopeSpans ?? [])
        .flatMap((ss) => ss.spans ?? [])
        .find((s) => s.name === 'smoke-harness-span');

      expect(span, 'captured span').to.exist;
    });
  });
});
