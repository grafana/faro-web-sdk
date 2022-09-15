import { Conventions } from '@grafana/agent-core';

context('Events', () => {
  it('will capture a click event', () => {
    cy.clickButton('btn-event-with-attrs');
    cy.waitEvents(() => {}); // skip session event
    cy.waitEvents((events) => {
      expect(events).to.have.lengthOf(1);
      const event = events[0]!;
      expect(event).property('name').to.equal('click_button_with_attributes');
      expect(event).property('attributes').property('foo').to.equal('bar');
    });
  });

  it('will capture starts session event', () => {
    cy.waitEvents((events) => {
      expect(events).to.have.lengthOf(1);
      const event = events[0]!;
      expect(event).property('name').to.equal(Conventions.EventNames.SESSION_START);
    });
    cy.clickButton('btn-new-session');
    cy.waitEvents((events) => {
      expect(events).to.have.lengthOf(1);
      const event = events[0]!;
      expect(event).property('name').to.equal(Conventions.EventNames.SESSION_START);
    });
  });
});
