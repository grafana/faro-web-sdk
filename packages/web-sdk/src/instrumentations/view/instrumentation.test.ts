import { Conventions, EventEvent, initializeFaro, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { ViewInstrumentation } from './instrumentation';

describe('ViewInstrumentation', () => {
  it('will send view start event on initialize', () => {
    const transport = new MockTransport();
    const view = { name: 'my-view' };

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new ViewInstrumentation()],
        view,
      })
    );

    expect(transport.items).toHaveLength(1);

    const event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(Conventions.EventNames.VIEW_CHANGED);
    expect(event.meta.view?.name).toEqual(view.name);
  });

  it('will send view changed event if setView is called.', () => {
    const transport = new MockTransport();
    const view = { name: 'my-view' };

    const { api, metas } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new ViewInstrumentation()],
        view,
      })
    );

    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(Conventions.EventNames.VIEW_CHANGED);
    expect(event.meta.view?.name).toEqual(view.name);

    metas.add({ user: { id: 'foo' } });
    expect(transport.items).toHaveLength(1);

    const newView = { name: 'my-changed-view' };
    api.setView(newView);
    expect(transport.items).toHaveLength(2);

    event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.meta.view?.name).toEqual(view.name);
  });
});
