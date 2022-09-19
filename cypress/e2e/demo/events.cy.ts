import type { TransportBody } from '@grafana/agent-core';

context('Events', () => {
  [
    {
      title: 'an event',
      btnName: 'event-with-attrs',
      aliasGenerator: (body: TransportBody) => {
        const item = body.events?.[0]!;

        return item?.attributes?.['foo'] === 'bar' && item?.attributes?.['baz'] === 'bad' ? 'event' : undefined;
      },
    },
  ].forEach(({ title, btnName, aliasGenerator }) => {
    it(`will capture ${title}`, () => {
      cy.interceptAgent(aliasGenerator);

      cy.visit('/features-page');

      cy.clickButton(`btn-${btnName}`);

      cy.wait('@event');
    });
  });
});
