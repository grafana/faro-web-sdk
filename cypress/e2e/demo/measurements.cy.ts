const EXPECTED_VITALS = ['ttfb', 'fcp', 'lcp', 'cls'];

context('Measurements', () => {
  it('web vitals are collected', () => {
    // load blank page to force page unload and sending
    cy.loadBlank()

    cy.waitMeasurements(events => {
      expect(events).to.have.lengthOf(4)
      const vitals = events.flatMap(evt => Object.keys(evt.values))
      EXPECTED_VITALS.forEach(vital => expect(vitals).to.include(vital))
    }, 4)
  })
})
