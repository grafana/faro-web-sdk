/// <reference types="cypress" />

context('Tracing', () => {

  it('will capture log with trace context', () => {
    cy.clickButton('btn-trace-with-log')
    const context = {
      span_id: '',
      trace_id: ''
    }
    cy.waitLogs(logEvents => {
      expect(logEvents).to.have.lengthOf(1)
      const log = logEvents[0]!
      expect(log).property('message').to.equal('trace with log button clicked')
      expect(log).to.have.property('trace')
      Object.assign(context, log.trace!)
    })
    cy.waitTraces(traceEvent => {
      expect(context.span_id).to.have.length.greaterThan(0)
      expect(context.trace_id).to.have.length.greaterThan(1)
      const spans = traceEvent.resourceSpans!.flatMap(r => r.instrumentationLibrarySpans.flatMap(i => i.spans!));
      expect(!!spans.find(span => span.traceId === context.trace_id && span.spanId === context.span_id)!!).to.equal(true);
    });
  })
})

export {}
