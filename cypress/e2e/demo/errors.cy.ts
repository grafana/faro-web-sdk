/// <reference types="cypress" />

context('Errors', () => {

  function checkErrorReported(type: string, value: string, expectStacktrace = true, expectedRequests = 4) {
    cy.wait(times('@collector', expectedRequests)).then(interceptions => {
      const exceptionPayloads = interceptions.map(i => i.request.body).filter(b => !!b.exceptions)
      expect(exceptionPayloads).to.have.lengthOf(1)
      expect(exceptionPayloads[0].exceptions).to.have.lengthOf(1)
      const exception = exceptionPayloads[0].exceptions[0]
      expect(exception).property('type').to.equal(type)
      expect(exception).property('value').to.equal(value)
      if (expectStacktrace) {
        expect(exception).property('stacktrace').property('frames').to.have.length.greaterThan(1)
      }
    })
  }

  beforeEach(() => {
    cy.on('uncaught:exception', () => false)
  })

  it('thrown Error', () => {
    cy.get('[data-cy="btn-throw-error"]').click()
    checkErrorReported('Error', 'This is a thrown error')
  })

  it('undefined method error', () => {
    cy.get('[data-cy="btn-call-undefined"]').click()
    checkErrorReported('Error', 'test is not defined')
  })

  it('fetch error', () => {
    cy.get('[data-cy="btn-fetch-error"]').click()
    checkErrorReported('Error', 'Failed to fetch', false, 5)
  })

  it('promise rejection', () => {
    cy.get('[data-cy="btn-promise-reject"]').click()
    checkErrorReported('UnhandledRejection', 'Non-Error promise rejection captured with value: This is a rejected promise', false, 5)
  })
})

function times(alias: string, count: number): string[] {
  return Array.from(Array(count)).map(() => alias);
}

export {};
