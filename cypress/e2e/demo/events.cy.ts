context('Events', () => {
  it('will capture an event', () => {
    cy.clickButton('btn-event-with-attrs');

    cy.waitEvents((events) => {
      expect(events).to.have.lengthOf(1);
      const event = events[0]!;
      expect(event).property('name').to.equal('click_button_with_attributes');
      expect(event).property('attributes').property('foo').to.equal('bar');
    });
  });
});
