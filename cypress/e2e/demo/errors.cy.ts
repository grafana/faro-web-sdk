/// <reference types="cypress" />

context('Errors', () => {
  it('uncaught errors are reported', () => {

    cy.on('uncaught:exception', () => false);

    cy.get('[data-cy="btn-throw-error"]').click()

    cy.wait(times('@collector', 4)).then(interceptions => {
      const exceptionPayloads = interceptions.map(i => i.request.body).filter(b => !!b.exceptions)
      expect(exceptionPayloads[0].exceptions).to.have.lengthOf(1);
      const exception = exceptionPayloads[0].exceptions[0];
      expect(exception).property('type').to.equal('Error');
      expect(exception).property('value').to.equal('This is a thrown error');
      expect(exception).property('stacktrace').property('frames').to.have.length.greaterThan(1);
    })
  })
})

function times(alias: string, count: number): string[] {
  return Array.from(Array(count)).map(() => alias);
}
