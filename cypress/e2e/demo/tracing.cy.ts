/// <reference types="cypress" />

context('Tracing', () => {

  it('will capture log with trace context', () => {
    cy.clickButton('btn-trace-with-log')
    cy.collect(5, payloads => {
      const logs = payloads.filter(p => !!p.logs)!;
      expect(logs).to.have.lengthOf(1);
      const log = logs[0]?.logs?.[0]!
      expect(log).property('message').to.equal('trace with log button clicked')
      expect(log).to.have.property('trace')
      const { span_id, trace_id } = log.trace!;
      const traces = payloads.filter(p => !!p.traces)!;
      expect(traces).to.have.lengthOf(1);
      const spans = traces[0]!.traces!.resourceSpans!.flatMap(r => r.instrumentationLibrarySpans.flatMap(i => i.spans!));
      expect(!!spans.find(span => span.traceId === trace_id && span.spanId === span_id)!!).to.equal(true);
    });
  })
})

export {}
