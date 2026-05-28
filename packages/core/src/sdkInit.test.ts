import type { EventEvent } from './api';
import { initializeFaro } from './initialize';
import { BaseInstrumentation } from './instrumentations';
import type { Instrumentation } from './instrumentations';
import { EVENT_SDK_INIT } from './semantic';
import { mockConfig, MockTransport } from './testUtils';
import type { TransportItem } from './transports';

class TestInstrumentation extends BaseInstrumentation {
  override name = 'test-instrumentation';
  override version = '1.2.3';

  initialize(): void {}
}

class ContextfulInstrumentation extends BaseInstrumentation {
  override name = 'contextful-instrumentation';
  override version = '4.5.6';

  initialize(): void {}

  getInitContext = () => ({
    react_router_version: '6.20.0',
    feature_flag: true,
  });
}

function findInitEvent(transport: MockTransport): TransportItem<EventEvent> | undefined {
  return transport.items.find(
    (item) => item.type === 'event' && (item.payload as EventEvent).name === EVENT_SDK_INIT
  ) as TransportItem<EventEvent> | undefined;
}

type IntegrationEntry = {
  name: string;
  version: string;
  context?: Record<string, unknown>;
};

describe('pushSdkInitEvent', () => {
  it('fires a single init event during initializeFaro with sdk and integration details', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        disableSdkInitEvent: false,
        instrumentations: [new TestInstrumentation() as unknown as Instrumentation],
        transports: [transport],
      })
    );

    const initEvents = transport.items.filter(
      (item) => item.type === 'event' && (item.payload as EventEvent).name === EVENT_SDK_INIT
    );
    expect(initEvents).toHaveLength(1);

    const event = initEvents[0]!.payload as EventEvent;
    expect(event.attributes!['sdk_name']).toBe('faro');
    expect(typeof event.attributes!['sdk_version']).toBe('string');
    expect(event.attributes!['sdk_version']!.length).toBeGreaterThan(0);

    const integrations = JSON.parse(event.attributes!['integrations']!) as IntegrationEntry[];
    expect(integrations).toEqual([
      {
        name: 'test-instrumentation',
        version: '1.2.3',
      },
    ]);
  });

  it('includes integration-specific context from getInitContext()', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        disableSdkInitEvent: false,
        instrumentations: [new ContextfulInstrumentation() as unknown as Instrumentation],
        transports: [transport],
      })
    );

    const event = findInitEvent(transport)!.payload;
    const integrations = JSON.parse(event.attributes!['integrations']!) as IntegrationEntry[];

    expect(integrations).toEqual([
      {
        name: 'contextful-instrumentation',
        version: '4.5.6',
        context: {
          react_router_version: '6.20.0',
          feature_flag: true,
        },
      },
    ]);
  });

  it('does not fire the init event when disableSdkInitEvent is true', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        disableSdkInitEvent: true,
        instrumentations: [new TestInstrumentation() as unknown as Instrumentation],
        transports: [transport],
      })
    );

    expect(findInitEvent(transport)).toBeUndefined();
  });

  it('omits the context field when getInitContext returns an empty object', () => {
    class NoContextInstrumentation extends BaseInstrumentation {
      override name = 'no-context';
      override version = '0.0.1';
      getInitContext = () => ({});
      initialize(): void {}
    }

    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        disableSdkInitEvent: false,
        instrumentations: [new NoContextInstrumentation() as unknown as Instrumentation],
        transports: [transport],
      })
    );

    const integrations = JSON.parse(
      findInitEvent(transport)!.payload.attributes!['integrations']!
    ) as IntegrationEntry[];
    expect(integrations[0]).not.toHaveProperty('context');
  });

  it('fires with an empty integrations list when no instrumentations are registered', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        disableSdkInitEvent: false,
        instrumentations: [],
        transports: [transport],
      })
    );

    const event = findInitEvent(transport)!.payload;
    expect(event.attributes!['integrations']).toBe('[]');
  });

  it('does not bypass the paused state', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        disableSdkInitEvent: false,
        instrumentations: [new TestInstrumentation() as unknown as Instrumentation],
        paused: true,
        transports: [transport],
      })
    );

    expect(transport.items).toHaveLength(0);
  });
});
