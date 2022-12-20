import type { TransportBody } from '@grafana/faro-core';

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
    {
      title: 'an event with different session',
      btnName: 'new-session',
      aliasGenerator: (body: TransportBody) => {
        const item = body.events?.[0]!;

        return item ? 'event' : undefined;
      },
      afterTest: () => {
        let alias: string | undefined = undefined;

        cy.interceptCollector((body) => {
          if (!alias && body.meta.session?.id) {
            alias = body.meta.session?.id;
          }

          if (alias && body.meta.session?.id && body.meta.session?.id !== alias) {
            return 'new-session';
          }

          return undefined;
        });

        cy.clickButton('btn-event-without-attrs');

        cy.clickButton('btn-new-session');

        cy.wait('@new-session');
      },
    },
    {
      title: 'an event with different view',
      btnName: 'change-view',
      aliasGenerator: (body: TransportBody) => {
        const item = body.events?.[0]!;

        return item ? 'event' : undefined;
      },
      afterTest: () => {
        let alias: string | undefined = undefined;

        cy.interceptCollector((body) => {
          if (!alias && body.meta.view?.name) {
            alias = body.meta.view?.name;
          }

          if (alias && body.meta.view?.name && body.meta.view?.name !== alias) {
            return 'another-view';
          }

          return undefined;
        });

        cy.clickButton('btn-event-without-attrs');

        cy.clickButton('btn-change-view');

        cy.wait('@another-view');
      },
    },
  ].forEach(({ title, btnName, aliasGenerator, afterTest }) => {
    it(`will capture ${title}`, () => {
      cy.interceptCollector(aliasGenerator);

      cy.visit('/features');

      cy.clickButton(`btn-${btnName}`);

      cy.wait('@event');

      afterTest?.();
    });
  });
});
