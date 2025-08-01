import { EventEvent, initializeFaro, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { ViewInstrumentation } from './instrumentation';

describe('ViewInstrumentation', () => {
  it('will send view changed event if setView is called.', () => {
    const transport = new MockTransport();
    const view = { name: 'my-view' };

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new ViewInstrumentation()],
        view,
      })
    );

    const newView = { name: 'my-view' };
    api.setView(newView);
    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.meta.view?.name).toEqual(view.name);
  });
});
