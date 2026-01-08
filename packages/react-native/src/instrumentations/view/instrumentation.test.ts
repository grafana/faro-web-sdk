import { EventEvent, initializeFaro, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { ViewInstrumentation } from './index';

describe('ViewInstrumentation', () => {
  it('will send view changed event if setView is called', () => {
    const transport = new MockTransport();

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new ViewInstrumentation()],
      })
    );

    // First setView call
    api.setView({ name: 'my-view' });
    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toBe('view_changed');
    expect(event.meta.view?.name).toEqual('my-view');
    expect(event.payload.attributes).toEqual({
      fromView: 'unknown',
      toView: 'my-view',
    });

    // Second setView call with different name
    const newView = { name: 'my-new-view' };
    api.setView(newView);
    expect(transport.items).toHaveLength(2);

    event = transport.items[1]! as TransportItem<EventEvent>;
    expect(event.payload.name).toBe('view_changed');
    expect(event.meta.view?.name).toEqual(newView.name);
    expect(event.payload.attributes).toEqual({
      fromView: 'my-view',
      toView: 'my-new-view',
    });
  });

  it('will not send view changed event if view name has not changed', () => {
    const transport = new MockTransport();

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new ViewInstrumentation()],
      })
    );

    // Set view
    api.setView({ name: 'my-view' });
    expect(transport.items).toHaveLength(1);

    // Set view to same name - should not trigger another event
    api.setView({ name: 'my-view' });
    expect(transport.items).toHaveLength(1);
  });

  it('will send view changed event when view name changes', () => {
    const transport = new MockTransport();

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new ViewInstrumentation()],
      })
    );

    api.setView({ name: 'view1' });
    expect(transport.items).toHaveLength(1);

    api.setView({ name: 'view2' });
    expect(transport.items).toHaveLength(2);

    api.setView({ name: 'view3' });
    expect(transport.items).toHaveLength(3);

    const event1 = transport.items[1]! as TransportItem<EventEvent>;
    expect(event1.meta.view?.name).toEqual('view2');
    expect(event1.payload.attributes).toEqual({
      fromView: 'view1',
      toView: 'view2',
    });

    const event2 = transport.items[2]! as TransportItem<EventEvent>;
    expect(event2.meta.view?.name).toEqual('view3');
    expect(event2.payload.attributes).toEqual({
      fromView: 'view2',
      toView: 'view3',
    });
  });
});
