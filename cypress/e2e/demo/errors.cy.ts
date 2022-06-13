context('Errors', () => {

  function checkErrorReported(type: string, value: string, expectStacktrace = true) {
    cy.waitExceptions(events => {
      expect(events).to.have.lengthOf(1)
      const exception = events[0];
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
    checkErrorReported('Error', 'Failed to fetch', false)
  })

  it('promise rejection', () => {
    cy.clickButton('btn-promise-reject')
    checkErrorReported('UnhandledRejection', 'Non-Error promise rejection captured with value: This is a rejected promise', false)
  })
})

export {};
