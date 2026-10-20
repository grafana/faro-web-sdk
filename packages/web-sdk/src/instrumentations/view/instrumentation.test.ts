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
  // Reported in issue #349: calling setView on every route change appeared to emit a duplicate
  // view_changed per navigation, interleaved with events for the default view.
  it('emits one view changed event per distinct view and none for a repeated view', () => {
    const transport = new MockTransport();

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new ViewInstrumentation()],
      })
    );

    api.setView({ name: 'A' });
    api.setView({ name: 'B' });
    api.setView({ name: 'C' });
    // navigating to the route that is already active must not emit again
    api.setView({ name: 'C' });

    const events = (transport.items as Array<TransportItem<EventEvent>>).map((item) => item.payload.attributes);

    expect(events).toEqual([
      { fromView: 'unknown', toView: 'A' },
      { fromView: 'A', toView: 'B' },
      { fromView: 'B', toView: 'C' },
    ]);
  });
});
