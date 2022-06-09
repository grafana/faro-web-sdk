/// <reference types="cypress" />

context('Errors', () => {

  function checkErrorReported(type: string, value: string, expectStacktrace = true, expectedRequests = 4) {
    cy.collect(expectedRequests, payloads => {
      const exceptionPayloads = payloads.filter(b => !!b.exceptions)
      expect(exceptionPayloads).to.have.lengthOf(1)
      expect(exceptionPayloads[0]?.exceptions).to.have.lengthOf(1)
      const exception = exceptionPayloads[0]?.exceptions?.[0]
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
    cy.clickButton('btn-throw-error')
    checkErrorReported('Error', 'This is a thrown error')
  })

  it('undefined method error', () => {
    cy.clickButton('btn-call-undefined')
    checkErrorReported('Error', 'test is not defined')
  })

  it('fetch error', () => {
    cy.clickButton('btn-fetch-error')
    checkErrorReported('Error', 'Failed to fetch', false, 5)
  })

  it('promise rejection', () => {
    cy.clickButton('btn-promise-reject')
    checkErrorReported('UnhandledRejection', 'Non-Error promise rejection captured with value: This is a rejected promise', false, 5)
  })
})

export {};
