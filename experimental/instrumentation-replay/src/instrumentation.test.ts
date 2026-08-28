import {
  BaseTransport,
  genShortID,
  getTransportBody,
  initializeFaro,
  type TransportBody,
  type TransportItem,
} from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';
import { EventType } from '@grafana/rrweb-types';

import { defaultMaskInputFn } from './const';
import { ReplayInstrumentation } from './instrumentation';
import { MaskInputFn, ReplayInstrumentationOptions } from './types';

// Mock rrweb
jest.mock('@grafana/rrweb', () => {
  const record = Object.assign(jest.fn(), { takeFullSnapshot: jest.fn() });
  return { record };
});

class BatchedBodyTransport extends BaseTransport {
  readonly name = '@grafana/transport-batched-body-mock';
  readonly version = 'test';

  sentBodies: TransportBody[] = [];

  send(items: TransportItem | TransportItem[]): void {
    this.sentBodies.push(getTransportBody(Array.isArray(items) ? items : [items]));
  }

  override isBatched(): boolean {
    return true;
  }
}

function createSeededRandom(seed: number): () => number {
  let current = seed >>> 0;

  return () => {
    current = (Math.imul(current, 1_664_525) + 1_013_904_223) >>> 0;
    return current / 0x1_0000_0000;
  };
}

describe('ReplayInstrumentation', () => {
  let instrumentation: ReplayInstrumentation;
  let mockRecord: jest.Mock & { takeFullSnapshot: jest.Mock };
  let mockGetSession: jest.Mock;
  let mockAddListener: jest.Mock;
  let mockPushEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    mockRecord = require('@grafana/rrweb').record;
    mockRecord.mockReturnValue(jest.fn());

    // Mock API and metas
    mockGetSession = jest.fn();
    mockAddListener = jest.fn();
    mockPushEvent = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (instrumentation) {
      instrumentation.destroy();
    }
  });

  describe('constructor', () => {
    it('should have correct name and version', () => {
      instrumentation = new ReplayInstrumentation();

      expect(instrumentation.name).toBe('@grafana/faro-instrumentation-replay');
      expect(instrumentation.version).toBeDefined();
    });

    it('should use default options when none provided', () => {
      instrumentation = new ReplayInstrumentation();

      const expectedDefaults: ReplayInstrumentationOptions = {
        recordCrossOriginIframes: false,
        recordAfter: 'load',
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
        },
        maskInputFn: defaultMaskInputFn,
        collectFonts: false,
        inlineImages: false,
        inlineStylesheet: false,
        recordCanvas: false,
        maskTextSelector: '*',
        blockSelector: undefined,
        ignoreSelector: undefined,
        beforeSend: undefined,
        sanitizeMetaHref: true,
        samplingRate: 1,
        inactivityThresholdMs: 60_000,
      };

      expect(instrumentation['options']).toEqual(expectedDefaults);
    });

    it('should use custom options when provided', () => {
      const beforeSendFn = jest.fn();
      const maskInputFn: MaskInputFn = jest.fn((text, _element) => '*'.repeat(text.length));
      const customOptions: ReplayInstrumentationOptions = {
        recordCrossOriginIframes: true,
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true,
        },
        maskInputFn,
        collectFonts: true,
        inlineImages: true,
        inlineStylesheet: true,
        recordCanvas: true,
        recordAfter: 'DOMContentLoaded',
        maskTextSelector: '.mask-me',
        blockSelector: '.block-me',
        ignoreSelector: '.ignore-me',
        beforeSend: beforeSendFn,
        sanitizeMetaHref: false,
        samplingRate: 1,
        inactivityThresholdMs: 30_000,
      };

      instrumentation = new ReplayInstrumentation(customOptions);

      expect(instrumentation['options']).toEqual(customOptions);
    });

    it('should merge partial custom options with defaults', () => {
      const partialOptions: ReplayInstrumentationOptions = {
        recordAfter: 'DOMContentLoaded',
        maskAllInputs: false,
        recordCanvas: true,
      };

      instrumentation = new ReplayInstrumentation(partialOptions);

      expect(instrumentation['options'].maskAllInputs).toBe(false);
      expect(instrumentation['options'].recordCanvas).toBe(true);

      // Defaults should still be present
      const expected: ReplayInstrumentationOptions = {
        recordCrossOriginIframes: false,
        recordAfter: 'DOMContentLoaded',
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
        maskInputFn: defaultMaskInputFn,
        collectFonts: false,
        inlineImages: false,
        inlineStylesheet: false,
        recordCanvas: true,
        maskTextSelector: '*',
        blockSelector: undefined,
        ignoreSelector: undefined,
        beforeSend: undefined,
        sanitizeMetaHref: true,
        samplingRate: 1,
        inactivityThresholdMs: 60_000,
      };

      expect(instrumentation['options']).toEqual(expected);
    });
  });

  describe('maskInputFn', () => {
    it('should produce identical-length output for inputs of different lengths', () => {
      const short = defaultMaskInputFn('1234', document.createElement('input'));
      const long = defaultMaskInputFn('4111111111111111card', document.createElement('input'));

      expect(short).toBe('******');
      expect(long).toBe('******');
      expect(short.length).toBe(long.length);
    });

    it('should return an empty string for empty input', () => {
      const empty = defaultMaskInputFn('', document.createElement('input'));
      expect(empty).toBe('');
    });

    it('should use the default fixed-length maskInputFn when none is provided', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({ id: 'test-session', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          maskInputFn: defaultMaskInputFn,
        })
      );
    });

    it('should allow a custom maskInputFn to override the default', () => {
      const customMaskFn: MaskInputFn = () => 'CUSTOM_MASK';

      instrumentation = new ReplayInstrumentation({ maskInputFn: customMaskFn });

      mockGetSession.mockReturnValue({ id: 'test-session', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          maskInputFn: customMaskFn,
        })
      );
      expect(instrumentation['options'].maskInputFn).not.toBe(defaultMaskInputFn);
    });

    it('should fall back to the secure default when maskInputFn is explicitly undefined', () => {
      instrumentation = new ReplayInstrumentation({ maskInputFn: undefined });

      expect(instrumentation['options'].maskInputFn).toBe(defaultMaskInputFn);
    });
  });

  describe('initialize', () => {
    it('should start recording when session is sampled', () => {
      instrumentation = new ReplayInstrumentation();

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockGetSession).toHaveBeenCalled();
      expect(mockAddListener).toHaveBeenCalled();
      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should not start recording when session is not sampled', () => {
      instrumentation = new ReplayInstrumentation();

      // Mock unsampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'false' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockGetSession).toHaveBeenCalled();
      expect(mockAddListener).toHaveBeenCalled();
      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should pass default recordAfter option to rrweb record', () => {
      instrumentation = new ReplayInstrumentation();

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          recordAfter: 'load',
          maskAllInputs: true,
          maskTextSelector: '*',
        })
      );
    });

    it('should pass correct options to rrweb record', () => {
      const maskInputFn: MaskInputFn = jest.fn((text, _element) => '*'.repeat(text.length));
      const customOptions: ReplayInstrumentationOptions = {
        maskAllInputs: true,
        blockSelector: '.secret',
        recordCanvas: true,
        collectFonts: true,
        inlineImages: true,
        inlineStylesheet: true,
        recordCrossOriginIframes: true,
        maskTextSelector: '.mask',
        ignoreSelector: '.ignore',
        maskInputOptions: { password: true, email: true },
        maskInputFn,
        recordAfter: 'DOMContentLoaded',
      };

      instrumentation = new ReplayInstrumentation(customOptions);

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          maskAllInputs: true,
          blockSelector: '.secret',
          recordCanvas: true,
          collectFonts: true,
          inlineImages: true,
          inlineStylesheet: true,
          recordCrossOriginIframes: true,
          maskTextSelector: '.mask',
          ignoreSelector: '.ignore',
          maskInputOptions: { password: true, email: true },
          maskInputFn,
          recordAfter: 'DOMContentLoaded',
          recordDOM: true,
          checkoutEveryNms: 300_000,
        })
      );
    });

    it('should push a faro.session_recording.started event when recording begins', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockPushEvent).toHaveBeenCalledWith('faro.session_recording.started', {
        recording_id: expect.any(String),
      });
    });

    it('should not push a faro.session_recording.started event when session is not sampled', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'false' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockPushEvent).not.toHaveBeenCalled();
    });

    it('should handle errors during recording start gracefully', () => {
      mockRecord.mockImplementation(() => {
        throw new Error('rrweb init failed');
      });

      instrumentation = new ReplayInstrumentation();

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      const logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');

      expect(() => instrumentation.initialize()).not.toThrow();
      expect(logWarnSpy).toHaveBeenCalledWith('Failed to start session replay', expect.any(Error));
    });
  });

  describe('handleEvent', () => {
    let emitCallback: (event: any, isCheckout?: boolean) => void;

    beforeEach(() => {
      mockRecord.mockImplementation((opts) => {
        emitCallback = opts.emit;
        return jest.fn();
      });
    });

    it('should push events to the API', () => {
      instrumentation = new ReplayInstrumentation();

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const testEvent = { type: 1, data: {}, timestamp: Date.now() };
      emitCallback(testEvent);

      expect(mockPushEvent).toHaveBeenCalledWith('faro.session_recording.event', {
        event: JSON.stringify(testEvent),
        recording_id: expect.any(String),
        gen: '0',
        seq: '0',
      });
    });

    it('should apply beforeSend transformation to events', () => {
      const beforeSend = jest.fn((event) => ({ ...event, modified: true }));

      instrumentation = new ReplayInstrumentation({ beforeSend });

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const testEvent = { type: 1, data: {}, timestamp: Date.now() };
      emitCallback(testEvent);

      expect(beforeSend).toHaveBeenCalledWith(testEvent);
      expect(mockPushEvent).toHaveBeenCalledWith('faro.session_recording.event', {
        event: JSON.stringify({ ...testEvent, modified: true }),
        recording_id: expect.any(String),
        gen: '0',
        seq: '0',
      });
    });

    it('should skip sending event if beforeSend returns null', () => {
      const beforeSend = jest.fn(() => null);

      instrumentation = new ReplayInstrumentation({ beforeSend });

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      emitCallback({ type: 1, data: {}, timestamp: Date.now() });

      expect(beforeSend).toHaveBeenCalled();
      expect(mockPushEvent).not.toHaveBeenCalledWith('faro.session_recording.event', expect.anything());
    });

    it('should skip sending event if beforeSend returns undefined', () => {
      const beforeSend = jest.fn(() => undefined);

      instrumentation = new ReplayInstrumentation({ beforeSend });

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      emitCallback({ type: 1, data: {}, timestamp: Date.now() });

      expect(beforeSend).toHaveBeenCalled();
      expect(mockPushEvent).not.toHaveBeenCalledWith('faro.session_recording.event', expect.anything());
    });

    it('should strip query string and fragment from Meta event href by default', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { href: 'https://example.com/app/dashboard?code=abc&token=xyz#fragment', width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBe('https://example.com/app/dashboard');
    });

    it('should not modify non-Meta events', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const nonMetaEvent = {
        type: 3,
        data: { href: 'https://example.com/page?secret=value' },
        timestamp: Date.now(),
      };
      emitCallback(nonMetaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBe('https://example.com/page?secret=value');
    });

    it('should preserve Meta event href when sanitizeMetaHref is false', () => {
      instrumentation = new ReplayInstrumentation({ sanitizeMetaHref: false });

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { href: 'https://example.com/app?keep=this#and-this', width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBe('https://example.com/app?keep=this#and-this');
    });

    it('should strip Meta event href before beforeSend sees the event', () => {
      const beforeSend = jest.fn((event) => event);

      instrumentation = new ReplayInstrumentation({ beforeSend });

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { href: 'https://example.com/path?token=secret', width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      expect(beforeSend).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ href: 'https://example.com/path' }),
        })
      );
    });

    it('should strip Meta event href again after beforeSend returns a replacement event', () => {
      const beforeSend: ReplayInstrumentationOptions['beforeSend'] = jest.fn(() => ({
        type: EventType.Meta,
        data: { href: 'https://example.com/reintroduced?token=secret#hash', width: 1920, height: 1080 },
        timestamp: Date.now(),
      })) as ReplayInstrumentationOptions['beforeSend'];

      instrumentation = new ReplayInstrumentation({ beforeSend });

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { href: 'https://example.com/path?token=secret', width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBe('https://example.com/reintroduced');
    });

    it('should strip credentials from Meta event href', () => {
      instrumentation = new ReplayInstrumentation();
      const hrefWithCredentials = new URL('https://example.com/app?token=secret#hash');
      hrefWithCredentials.username = 'user';
      hrefWithCredentials.password = 'password';

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { href: hrefWithCredentials.href, width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBe('https://example.com/app');
    });

    it('should leave malformed href untouched on Meta events', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { href: 'not-a-valid-url', width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBe('not-a-valid-url');
    });

    it('should handle Meta event with missing href', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBeUndefined();
    });

    it('should leave malformed Meta event without data untouched', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed).toEqual(metaEvent);
    });

    it('should handle file:// URLs without corrupting them', () => {
      instrumentation = new ReplayInstrumentation();

      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      const metaEvent = {
        type: EventType.Meta,
        data: { href: 'file:///android_asset/www/index.html?token=secret#hash', width: 1920, height: 1080 },
        timestamp: Date.now(),
      };
      emitCallback(metaEvent);

      const pushed = mockPushEvent.mock.calls.find((c: any[]) => c[0] === 'faro.session_recording.event');
      const parsed = JSON.parse(pushed![1].event);
      expect(parsed.data.href).toBe('file:///android_asset/www/index.html');
    });

    it('should keep Meta event href sanitized when batched after a non-replay event', async () => {
      jest.useFakeTimers();
      try {
        const transport = new BatchedBodyTransport();
        instrumentation = new ReplayInstrumentation();
        const { api } = initializeFaro(
          mockConfig({
            instrumentations: [instrumentation],
            transports: [transport],
            metas: [{ page: { url: 'https://example.com/callback?code=abc#fragment' } }],
            batching: {
              enabled: true,
              sendTimeout: 1,
              itemLimit: 10,
            },
          })
        );

        api.setSession({ id: 'test-session', attributes: { isSampled: 'true' } });
        // Listener-triggered starts are deferred by a microtask.
        await Promise.resolve();
        jest.advanceTimersByTime(1);
        transport.sentBodies = [];

        api.pushEvent('custom.event');
        emitCallback({
          type: EventType.Meta,
          data: { href: 'https://example.com/app/dashboard?token=secret#hash', width: 1920, height: 1080 },
          timestamp: Date.now(),
        });
        jest.advanceTimersByTime(1);

        expect(transport.sentBodies).toHaveLength(1);
        expect(transport.sentBodies[0]!.meta.page?.url).toBe('https://example.com/callback?code=abc#fragment');

        const replayEvent = transport.sentBodies[0]!.events?.find(
          (event) => event.name === 'faro.session_recording.event'
        );
        expect(replayEvent).toBeDefined();

        const replayEventPayload = replayEvent!.attributes!['event'];
        expect(replayEventPayload).toBeDefined();

        const rrwebEvent = JSON.parse(replayEventPayload!);
        expect(rrwebEvent.data.href).toBe('https://example.com/app/dashboard');
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle errors when pushing events gracefully', () => {
      mockPushEvent.mockImplementation((eventName: string) => {
        if (eventName === 'faro.session_recording.event') {
          throw new Error('Push failed');
        }
      });

      instrumentation = new ReplayInstrumentation();

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { pushEvent: mockPushEvent, getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      const logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');
      instrumentation.initialize();

      expect(() => emitCallback({ type: 1, data: {}, timestamp: Date.now() })).not.toThrow();
      expect(logWarnSpy).toHaveBeenCalledWith('Failed to push faro.session_recording.event event', expect.any(Error));
    });
  });

  describe('delivery identity', () => {
    let emitCallback: (event: any, isCheckout?: boolean) => void;
    let metaListener: (() => void) | undefined;

    beforeEach(() => {
      mockRecord.mockImplementation((opts: any) => {
        emitCallback = opts.emit;
        return jest.fn();
      });
      metaListener = undefined;
      mockAddListener.mockImplementation((cb: () => void) => {
        metaListener = cb;
      });
    });

    function initSampled(
      options: ReplayInstrumentationOptions = {},
      sessionId: string = 'test-session'
    ): ReplayInstrumentation {
      const inst = new ReplayInstrumentation(options);
      mockGetSession.mockReturnValue({ id: sessionId, attributes: { isSampled: 'true' } });
      inst['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      inst['metas'] = { addListener: mockAddListener } as any;
      inst.initialize();
      return inst;
    }

    function replayAttributes(): Array<Record<string, string>> {
      return mockPushEvent.mock.calls
        .filter((call: any[]) => call[0] === 'faro.session_recording.event')
        .map((call: any[]) => call[1]);
    }

    function lifecycleAttributes(eventName: string): Array<Record<string, string>> {
      return mockPushEvent.mock.calls.filter((call: any[]) => call[0] === eventName).map((call: any[]) => call[1]);
    }

    function metaEvent() {
      return {
        type: EventType.Meta,
        data: { href: 'https://example.com/', width: 1, height: 1 },
        timestamp: Date.now(),
      };
    }

    function fullSnapshotEvent() {
      return { type: EventType.FullSnapshot, data: {}, timestamp: Date.now() };
    }

    function incrementalEvent(data: Record<string, unknown> = {}) {
      return { type: EventType.IncrementalSnapshot, data, timestamp: Date.now() };
    }

    it('should stamp events with a stable recording_id, gen 0, and a contiguous seq', () => {
      instrumentation = initSampled();

      emitCallback(metaEvent());
      emitCallback(fullSnapshotEvent());
      emitCallback(incrementalEvent());
      emitCallback(incrementalEvent());

      const attrs = replayAttributes();
      expect(attrs).toHaveLength(4);

      const recordingId = attrs[0]!['recording_id'];
      expect(recordingId).toEqual(expect.any(String));
      expect(recordingId!.length).toBeGreaterThan(0);
      expect(attrs.every((a) => a['recording_id'] === recordingId)).toBe(true);

      expect(attrs.map((a) => a['gen'])).toEqual(['0', '0', '0', '0']);
      expect(attrs.map((a) => a['seq'])).toEqual(['0', '1', '2', '3']);
    });

    it('should advance gen on each emitted Meta and keep seq contiguous across the checkout', () => {
      instrumentation = initSampled();

      emitCallback(metaEvent());
      emitCallback(fullSnapshotEvent());
      emitCallback(incrementalEvent());

      // A scheduled checkout emits Meta and FullSnapshot, both flagged isCheckout=true.
      // The flag must be irrelevant: only the Meta event advances gen.
      emitCallback(metaEvent(), true);
      emitCallback(fullSnapshotEvent(), true);
      emitCallback(incrementalEvent());

      const attrs = replayAttributes();
      expect(attrs.map((a) => a['gen'])).toEqual(['0', '0', '0', '1', '1', '1']);
      expect(attrs.map((a) => a['seq'])).toEqual(['0', '1', '2', '3', '4', '5']);
    });

    it('should not advance gen or consume seq for events dropped by beforeSend', () => {
      instrumentation = initSampled({
        beforeSend: (event: any) => (event.data?.['drop'] === true ? null : event),
      });

      emitCallback(metaEvent());
      emitCallback(incrementalEvent({ drop: true }));
      emitCallback(incrementalEvent());
      emitCallback({ ...metaEvent(), data: { drop: true } });
      emitCallback(incrementalEvent());

      const attrs = replayAttributes();
      expect(attrs.map((a) => a['gen'])).toEqual(['0', '0', '0']);
      expect(attrs.map((a) => a['seq'])).toEqual(['0', '1', '2']);
    });

    it('should keep identity attributes intact when beforeSend mutates the event', () => {
      instrumentation = initSampled({
        beforeSend: (event: any) => ({ ...event, data: { mutated: true } }),
      });

      emitCallback(incrementalEvent({ original: true }));

      const attrs = replayAttributes();
      expect(attrs).toHaveLength(1);
      expect(JSON.parse(attrs[0]!['event']!).data).toEqual({ mutated: true });
      expect(attrs[0]!['recording_id']).toEqual(expect.any(String));
      expect(attrs[0]!['gen']).toBe('0');
      expect(attrs[0]!['seq']).toBe('0');
    });

    it('should increment gen with no seq gap across an inactivity pause and resume', () => {
      jest.useFakeTimers();
      try {
        instrumentation = initSampled({ inactivityThresholdMs: 5_000 });

        emitCallback(metaEvent());
        emitCallback(fullSnapshotEvent());

        jest.advanceTimersByTime(5_000);
        expect(instrumentation['isPaused']).toBe(true);

        document.dispatchEvent(new Event('pointerdown'));
        expect(instrumentation['isPaused']).toBe(false);

        // The resume restarted rrweb; drive its fresh snapshot through the new emit.
        emitCallback(metaEvent());
        emitCallback(fullSnapshotEvent());

        const attrs = replayAttributes();
        expect(attrs.map((a) => a['gen'])).toEqual(['0', '0', '1', '1']);
        expect(attrs.map((a) => a['seq'])).toEqual(['0', '1', '2', '3']);
        expect(new Set(attrs.map((a) => a['recording_id'])).size).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should stamp lifecycle events with recording_id and no gen or seq', () => {
      jest.useFakeTimers();
      try {
        instrumentation = initSampled({ inactivityThresholdMs: 5_000 });

        jest.advanceTimersByTime(5_000);
        document.dispatchEvent(new Event('pointerdown'));

        for (const eventName of [
          'faro.session_recording.started',
          'faro.session_recording.paused',
          'faro.session_recording.resumed',
        ]) {
          const attrs = lifecycleAttributes(eventName);
          expect(attrs.length).toBeGreaterThan(0);
          for (const a of attrs) {
            expect(a['recording_id']).toEqual(expect.any(String));
            expect(a).not.toHaveProperty('gen');
            expect(a).not.toHaveProperty('seq');
          }
        }
      } finally {
        jest.useRealTimers();
      }
    });

    it('should mint a new recording_id and reset gen and seq when the session rotates', async () => {
      instrumentation = initSampled({}, 'session-a');

      emitCallback(metaEvent());
      const firstRecordingId = replayAttributes()[0]!['recording_id'];

      mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'true' } });
      metaListener!();

      // The stop is synchronous; the restart is deferred out of the listener call stack.
      expect(instrumentation['isRecording']).toBe(false);
      expect(mockRecord).toHaveBeenCalledTimes(1);

      await Promise.resolve();

      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(instrumentation['isRecording']).toBe(true);

      const startedAttrs = lifecycleAttributes('faro.session_recording.started');
      expect(startedAttrs).toHaveLength(2);
      expect(startedAttrs[1]!['recording_id']).not.toBe(startedAttrs[0]!['recording_id']);

      emitCallback(metaEvent());
      const attrs = replayAttributes();
      const rotatedEvent = attrs[attrs.length - 1]!;
      expect(rotatedEvent['recording_id']).not.toBe(firstRecordingId);
      expect(rotatedEvent['gen']).toBe('0');
      expect(rotatedEvent['seq']).toBe('0');
    });

    it('should ignore the transient no-session notification from setSession', async () => {
      instrumentation = initSampled();
      expect(mockRecord).toHaveBeenCalledTimes(1);

      // Core setSession removes the session meta before re-adding it, so listeners
      // transiently observe a state with no session.
      mockGetSession.mockReturnValue(undefined);
      metaListener!();

      expect(instrumentation['isRecording']).toBe(true);

      mockGetSession.mockReturnValue({ id: 'test-session', attributes: { isSampled: 'true' } });
      metaListener!();
      await Promise.resolve();

      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(lifecycleAttributes('faro.session_recording.started')).toHaveLength(1);
    });

    it('should not restart recording when a session notification carries an unchanged id', async () => {
      instrumentation = initSampled();

      metaListener!();
      await Promise.resolve();

      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(lifecycleAttributes('faro.session_recording.started')).toHaveLength(1);
    });

    it('should coalesce a burst of rotations into one restart bound to the latest session', async () => {
      instrumentation = initSampled({}, 'session-a');

      mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'true' } });
      metaListener!();
      mockGetSession.mockReturnValue({ id: 'session-c', attributes: { isSampled: 'true' } });
      metaListener!();

      await Promise.resolve();

      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(lifecycleAttributes('faro.session_recording.started')).toHaveLength(2);

      // The recording is bound to the latest session: another session-c notification
      // is a no-op.
      metaListener!();
      await Promise.resolve();
      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(lifecycleAttributes('faro.session_recording.started')).toHaveLength(2);
    });

    it('should keep recording identity when sampling flips off and back on for the same session', async () => {
      instrumentation = initSampled();
      const firstStarted = lifecycleAttributes('faro.session_recording.started')[0]!;
      emitCallback(metaEvent());

      mockGetSession.mockReturnValue({ id: 'test-session', attributes: { isSampled: 'false' } });
      metaListener!();
      expect(instrumentation['isRecording']).toBe(false);

      mockGetSession.mockReturnValue({ id: 'test-session', attributes: { isSampled: 'true' } });
      metaListener!();
      await Promise.resolve();

      const started = lifecycleAttributes('faro.session_recording.started');
      expect(started).toHaveLength(2);
      expect(started[1]!['recording_id']).toBe(firstStarted['recording_id']);

      emitCallback(metaEvent());
      const attrs = replayAttributes();
      const latest = attrs[attrs.length - 1]!;
      expect(latest['recording_id']).toBe(started[1]!['recording_id']);
      expect(latest['gen']).toBe('1');
      expect(latest['seq']).toBe('1');
    });

    it('should stop a deferred start when sampling flips off while it is starting', async () => {
      const initialStop = jest.fn();
      const restartedStop = jest.fn();
      mockRecord.mockReturnValueOnce(initialStop).mockReturnValueOnce(restartedStop);
      instrumentation = initSampled({}, 'session-a');

      mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'true' } });
      metaListener!();
      expect(initialStop).toHaveBeenCalledTimes(1);

      let samplingFlipTriggered = false;
      mockPushEvent.mockImplementation((eventName: string) => {
        if (eventName === 'faro.session_recording.started' && !samplingFlipTriggered) {
          samplingFlipTriggered = true;
          mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'false' } });
          metaListener!();
        }
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(restartedStop).toHaveBeenCalledTimes(1);
    });

    it('should clear recording state when the rrweb stop function throws', () => {
      const stopError = new Error('rrweb stop failed');
      mockRecord.mockReturnValueOnce(
        jest.fn(() => {
          throw stopError;
        })
      );
      instrumentation = initSampled();
      const logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');

      mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'false' } });

      expect(() => metaListener!()).not.toThrow();
      expect(instrumentation['isRecording']).toBe(false);
      expect(instrumentation['stopFn']).toBeNull();
      expect(logWarnSpy).toHaveBeenCalledWith('Failed to stop session replay', stopError);
    });

    it.each([
      ['a sampled new session', 'session-b', 'true', 2],
      ['an unsampled new session', 'session-b', 'false', 1],
      ['the same session becoming unsampled', 'session-a', 'false', 1],
    ])(
      'should reconcile an initial started-event rotation to %s',
      async (_scenario, nextSessionId, isSampled, expectedStarts) => {
        const stops: jest.Mock[] = [];
        mockRecord.mockImplementation(() => {
          const stop = jest.fn();
          stops.push(stop);
          return stop;
        });

        let rotationTriggered = false;
        mockPushEvent.mockImplementation((eventName: string) => {
          if (eventName === 'faro.session_recording.started' && !rotationTriggered) {
            rotationTriggered = true;
            mockGetSession.mockReturnValue({ id: nextSessionId, attributes: { isSampled } });
            metaListener!();
          }
        });

        instrumentation = initSampled({}, 'session-a');
        await Promise.resolve();
        await Promise.resolve();

        expect(stops[0]).toHaveBeenCalledTimes(1);
        expect(mockRecord).toHaveBeenCalledTimes(expectedStarts);
        if (expectedStarts === 2) {
          expect(stops[1]).not.toHaveBeenCalled();
        }
      }
    );

    it('should restart with a new recording id when the session rotates while paused', async () => {
      jest.useFakeTimers();
      try {
        instrumentation = initSampled({ inactivityThresholdMs: 5_000 }, 'session-a');
        emitCallback(metaEvent());

        jest.advanceTimersByTime(5_000);
        expect(instrumentation['isPaused']).toBe(true);

        mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'true' } });
        metaListener!();
        await Promise.resolve();

        expect(instrumentation['isPaused']).toBe(false);
        const started = lifecycleAttributes('faro.session_recording.started');
        expect(started).toHaveLength(2);
        expect(started[1]!['recording_id']).not.toBe(started[0]!['recording_id']);

        emitCallback(metaEvent());
        const attrs = replayAttributes();
        expect(attrs[attrs.length - 1]!['recording_id']).toBe(started[1]!['recording_id']);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should stop recording when the session is deliberately cleared', () => {
      instrumentation = initSampled();
      expect(instrumentation['isRecording']).toBe(true);

      // resetSession()/setSession(undefined) re-adds a session meta WITHOUT an id —
      // unlike the transient mid-rotation state, where no session meta exists at all.
      mockGetSession.mockReturnValue({});
      metaListener!();

      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should emit either the complete identity triple or exactly recording_id, never a partial shape', () => {
      jest.useFakeTimers();
      try {
        instrumentation = initSampled({ inactivityThresholdMs: 5_000 });

        // Mixed scenario: initial chain with a sanitizable Meta href, a checkout, and
        // a pause-resume cycle.
        emitCallback({
          type: EventType.Meta,
          data: { href: 'https://example.com/app?token=secret#hash', width: 1, height: 1 },
          timestamp: Date.now(),
        });
        emitCallback(fullSnapshotEvent());
        emitCallback(metaEvent(), true);
        jest.advanceTimersByTime(5_000);
        document.dispatchEvent(new Event('pointerdown'));
        emitCallback(metaEvent());

        expect(mockPushEvent.mock.calls.length).toBeGreaterThan(0);
        for (const call of mockPushEvent.mock.calls) {
          const [name, attrs] = call as [string, Record<string, string>];
          if (name === 'faro.session_recording.event') {
            expect(Object.keys(attrs).sort()).toEqual(['event', 'gen', 'recording_id', 'seq']);
          } else {
            expect(Object.keys(attrs)).toEqual(['recording_id']);
          }
        }

        // Sanitization touches only the rrweb payload, never the identity attributes.
        const first = replayAttributes()[0]!;
        expect(JSON.parse(first['event']!).data.href).toBe('https://example.com/app');
        expect(first['recording_id']).toEqual(expect.any(String));
        expect(first['gen']).toBe('0');
        expect(first['seq']).toBe('0');
      } finally {
        jest.useRealTimers();
      }
    });

    it('should not restart recording after destroy even with a pending start', async () => {
      instrumentation = initSampled({}, 'session-a');

      mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'true' } });
      metaListener!();
      instrumentation.destroy();

      await Promise.resolve();

      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should push the started event before replay events when rrweb emits synchronously', () => {
      mockRecord.mockImplementation((opts: any) => {
        emitCallback = opts.emit;
        // Simulates rrweb taking the initial snapshot synchronously inside record().
        opts.emit(metaEvent());
        return jest.fn();
      });

      instrumentation = initSampled();

      const names = mockPushEvent.mock.calls.map((call: any[]) => call[0]);
      const startedIndex = names.indexOf('faro.session_recording.started');
      const firstReplayIndex = names.indexOf('faro.session_recording.event');
      expect(startedIndex).toBeGreaterThanOrEqual(0);
      expect(firstReplayIndex).toBeGreaterThanOrEqual(0);
      expect(startedIndex).toBeLessThan(firstReplayIndex);
    });

    it('should emit no started marker for a declined start and one ordered marker when retry succeeds', async () => {
      const successfulStop = jest.fn();
      mockRecord
        .mockImplementationOnce(() => undefined)
        .mockImplementationOnce((opts: any) => {
          emitCallback = opts.emit;
          opts.emit(metaEvent());
          return successfulStop;
        });

      instrumentation = initSampled();

      expect(lifecycleAttributes('faro.session_recording.started')).toHaveLength(0);
      expect(replayAttributes()).toHaveLength(0);

      metaListener!();
      await Promise.resolve();

      const names = mockPushEvent.mock.calls.map((call: any[]) => call[0]);
      expect(names).toEqual(['faro.session_recording.started', 'faro.session_recording.event']);
      expect(successfulStop).not.toHaveBeenCalled();
    });

    it('should discard synchronous replay events and the started marker when rrweb throws', () => {
      mockRecord.mockImplementationOnce((opts: any) => {
        opts.emit(metaEvent());
        throw new Error('rrweb failed');
      });

      instrumentation = initSampled();

      expect(lifecycleAttributes('faro.session_recording.started')).toHaveLength(0);
      expect(replayAttributes()).toHaveLength(0);
    });

    it('should push the resumed event before the fresh snapshot events on resume', () => {
      jest.useFakeTimers();
      try {
        instrumentation = initSampled({ inactivityThresholdMs: 5_000 });

        jest.advanceTimersByTime(5_000);
        expect(instrumentation['isPaused']).toBe(true);

        mockRecord.mockImplementation((opts: any) => {
          // Simulates rrweb taking the fresh snapshot synchronously inside record().
          opts.emit(metaEvent());
          return jest.fn();
        });
        document.dispatchEvent(new Event('pointerdown'));

        const names = mockPushEvent.mock.calls.map((call: any[]) => call[0]);
        const resumedIndex = names.lastIndexOf('faro.session_recording.resumed');
        const lastReplayIndex = names.lastIndexOf('faro.session_recording.event');
        expect(resumedIndex).toBeGreaterThanOrEqual(0);
        expect(resumedIndex).toBeLessThan(lastReplayIndex);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should emit no resumed markers for declined attempts and one ordered marker when retry succeeds', () => {
      jest.useFakeTimers();
      try {
        instrumentation = initSampled({ inactivityThresholdMs: 5_000 });
        jest.advanceTimersByTime(5_000);

        mockRecord
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(undefined)
          .mockImplementationOnce((opts: any) => {
            opts.emit(metaEvent());
            return jest.fn();
          });

        document.dispatchEvent(new Event('pointerdown'));
        document.dispatchEvent(new Event('pointerdown'));
        expect(lifecycleAttributes('faro.session_recording.resumed')).toHaveLength(0);

        const callCountBeforeSuccess = mockPushEvent.mock.calls.length;
        document.dispatchEvent(new Event('pointerdown'));

        const successfulAttemptNames = mockPushEvent.mock.calls
          .slice(callCountBeforeSuccess)
          .map((call: any[]) => call[0]);
        expect(successfulAttemptNames).toEqual(['faro.session_recording.resumed', 'faro.session_recording.event']);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should mint distinct recording ids for two concurrent instances', () => {
      const emits: Array<(event: any, isCheckout?: boolean) => void> = [];
      mockRecord.mockImplementation((opts: any) => {
        emits.push(opts.emit);
        return jest.fn();
      });

      instrumentation = initSampled();
      const secondInstrumentation = initSampled();

      try {
        emits[0]!(metaEvent());
        emits[1]!(metaEvent());

        const attrs = replayAttributes();
        expect(attrs).toHaveLength(2);
        expect(attrs[0]!['recording_id']).not.toBe(attrs[1]!['recording_id']);
        expect(attrs.map((a) => a['seq'])).toEqual(['0', '0']);
      } finally {
        secondInstrumentation.destroy();
      }
    });

    it('should deliver the new recording events when a rotation is detected mid-flush', async () => {
      jest.useFakeTimers();
      try {
        const transport = new BatchedBodyTransport();
        instrumentation = new ReplayInstrumentation();

        let rotated = false;
        const { api } = initializeFaro(
          mockConfig({
            instrumentations: [instrumentation],
            transports: [transport],
            batching: {
              enabled: true,
              sendTimeout: 1,
              itemLimit: 10,
            },
            // Simulates the session instrumentation's transport hook rotating the
            // session while the batch executor is flushing: items pushed synchronously
            // during a flush are discarded by the executor's buffer reset.
            beforeSend: (item) => {
              if (!rotated) {
                rotated = true;
                api.setSession({ id: 'rotated-session', attributes: { isSampled: 'true' } });
              }
              return item;
            },
          })
        );

        api.setSession({ id: 'first-session', attributes: { isSampled: 'true' } });
        await Promise.resolve();
        expect(mockRecord).toHaveBeenCalledTimes(1);

        // First flush: sends the first recording's started event and triggers the
        // rotation from inside the flush.
        jest.advanceTimersByTime(1);
        const firstStarted = transport.sentBodies
          .flatMap((body) => body.events ?? [])
          .find((event) => event.name === 'faro.session_recording.started');
        expect(firstStarted).toBeDefined();
        transport.sentBodies = [];

        // The restart is deferred out of the flush call stack, so the new recording's
        // events land in the next batch instead of being wiped.
        await Promise.resolve();
        expect(mockRecord).toHaveBeenCalledTimes(2);

        emitCallback({
          type: EventType.Meta,
          data: { href: 'https://example.com/', width: 1, height: 1 },
          timestamp: Date.now(),
        });
        emitCallback({ type: EventType.FullSnapshot, data: {}, timestamp: Date.now() });
        jest.advanceTimersByTime(1);

        const sentEvents = transport.sentBodies.flatMap((body) => body.events ?? []);
        const started = sentEvents.find((event) => event.name === 'faro.session_recording.started');
        const replayEvents = sentEvents.filter((event) => event.name === 'faro.session_recording.event');

        expect(started).toBeDefined();
        expect(started!.attributes!['recording_id']).not.toBe(firstStarted!.attributes!['recording_id']);
        expect(replayEvents).toHaveLength(2);
        expect(
          replayEvents.every((event) => event.attributes!['recording_id'] === started!.attributes!['recording_id'])
        ).toBe(true);
        expect(replayEvents.map((event) => event.attributes!['gen'])).toEqual(['0', '0']);
        expect(replayEvents.map((event) => event.attributes!['seq'])).toEqual(['0', '1']);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should continue recording identity across a clean full-page navigation', () => {
      window.sessionStorage.clear();
      const firstInstrumentation = initSampled({}, 'session-a');

      emitCallback(metaEvent());
      emitCallback(incrementalEvent());
      const firstPageEvents = replayAttributes();
      const recordingId = firstPageEvents[0]!['recording_id'];

      window.dispatchEvent(new Event('pagehide'));
      firstInstrumentation.destroy();
      mockPushEvent.mockClear();

      instrumentation = initSampled({}, 'session-a');
      expect(lifecycleAttributes('faro.session_recording.started')).toEqual([
        expect.objectContaining({ recording_id: recordingId }),
      ]);
      emitCallback(metaEvent());

      expect(replayAttributes()).toEqual([expect.objectContaining({ recording_id: recordingId, gen: '1', seq: '2' })]);
    });

    it('should mint a recovery recording instead of reusing an active handoff', () => {
      const firstDocument = initSampled({}, 'session-a');
      emitCallback(metaEvent());
      const firstRecordingId = replayAttributes()[0]!['recording_id'];
      mockPushEvent.mockClear();

      instrumentation = initSampled({}, 'session-a');
      try {
        emitCallback(metaEvent());

        expect(replayAttributes()).toEqual([expect.objectContaining({ gen: '0', seq: '0' })]);
        expect(replayAttributes()[0]!['recording_id']).not.toBe(firstRecordingId);
      } finally {
        firstDocument.destroy();
      }
    });

    it('should not write recording state while assigning replay event identity', () => {
      window.sessionStorage.clear();
      const storageSpy = jest.spyOn(Storage.prototype, 'setItem');
      instrumentation = initSampled({}, 'session-a');
      storageSpy.mockClear();

      emitCallback(metaEvent());
      for (let i = 0; i < 100; i++) {
        emitCallback(incrementalEvent());
      }

      expect(storageSpy).not.toHaveBeenCalled();
    });

    it('should rehydrate the latest clean handoff when restored from BFCache', () => {
      window.sessionStorage.clear();
      const firstDocument = initSampled({}, 'session-a');
      emitCallback(metaEvent());
      const recordingId = replayAttributes()[0]!['recording_id'];
      window.dispatchEvent(new Event('pagehide'));

      const secondDocument = initSampled({}, 'session-a');
      emitCallback(metaEvent());
      emitCallback(incrementalEvent());
      window.dispatchEvent(new Event('pagehide'));
      secondDocument.destroy();

      instrumentation = firstDocument;
      mockPushEvent.mockClear();
      const pageShowEvent = new Event('pageshow');
      Object.defineProperty(pageShowEvent, 'persisted', { value: true });
      window.dispatchEvent(pageShowEvent);
      emitCallback(metaEvent());

      expect(replayAttributes()).toEqual([expect.objectContaining({ recording_id: recordingId, gen: '2', seq: '3' })]);
    });

    it('should not run a pending session restart after pagehide seals the recording', async () => {
      window.sessionStorage.clear();
      instrumentation = initSampled({}, 'session-a');
      emitCallback(metaEvent());

      mockGetSession.mockReturnValue({ id: 'session-b', attributes: { isSampled: 'true' } });
      metaListener!();
      window.dispatchEvent(new Event('pagehide'));
      await Promise.resolve();

      expect(mockRecord).toHaveBeenCalledTimes(1);
    });

    it('should not run a pending initial start after pagehide', async () => {
      mockGetSession.mockReturnValue({ id: 'session-a', attributes: { isSampled: 'false' } });
      instrumentation = new ReplayInstrumentation();
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;
      instrumentation.initialize();

      mockGetSession.mockReturnValue({ id: 'session-a', attributes: { isSampled: 'true' } });
      instrumentation['metasListener']();
      window.dispatchEvent(new Event('pagehide'));
      await Promise.resolve();

      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should open a generation when rrweb emits a checkpoint for SPA navigation', () => {
      instrumentation = initSampled({}, 'session-a');
      emitCallback(metaEvent());
      emitCallback(fullSnapshotEvent());
      mockRecord.takeFullSnapshot.mockImplementation(() => {
        emitCallback(metaEvent());
        emitCallback(fullSnapshotEvent());
      });

      window.history.pushState({}, '', '/spa-navigation');

      expect(mockRecord.takeFullSnapshot).toHaveBeenCalledTimes(1);
      const attrs = replayAttributes();
      expect(attrs.map((event) => event['gen'])).toEqual(['0', '0', '1', '1']);
      expect(attrs.map((event) => event['seq'])).toEqual(['0', '1', '2', '3']);
    });

    it('should stop requesting SPA checkpoints after destroy', () => {
      instrumentation = initSampled({}, 'session-a');
      instrumentation.destroy();
      mockRecord.takeFullSnapshot.mockClear();

      window.history.pushState({}, '', '/after-replay-destroy');

      expect(mockRecord.takeFullSnapshot).not.toHaveBeenCalled();
    });

    it('should reconcile rotations after the same instance is removed and re-added', async () => {
      instrumentation = new ReplayInstrumentation();
      const faro = initializeFaro(
        mockConfig({
          instrumentations: [instrumentation],
          batching: { enabled: false },
        })
      );

      try {
        faro.api.setSession({ id: 'session-a', attributes: { isSampled: 'true' } });
        await Promise.resolve();
        expect(mockRecord).toHaveBeenCalledTimes(1);

        faro.instrumentations.remove(instrumentation);
        faro.instrumentations.add(instrumentation);
        expect(mockRecord).toHaveBeenCalledTimes(2);

        faro.api.setSession({ id: 'session-b', attributes: { isSampled: 'true' } });
        await Promise.resolve();
        await Promise.resolve();

        expect(mockRecord).toHaveBeenCalledTimes(3);
      } finally {
        faro.instrumentations.remove(instrumentation);
      }
    });

    it('should continue recording identity when the instance is replaced in the same document', () => {
      window.sessionStorage.clear();
      const firstInstrumentation = initSampled({}, 'session-a');
      emitCallback(metaEvent());
      emitCallback(incrementalEvent());
      const recordingId = replayAttributes()[0]!['recording_id'];

      firstInstrumentation.destroy();
      expect(JSON.parse(window.sessionStorage.getItem('com.grafana.faro.replay.recording:faro')!)).toEqual(
        expect.objectContaining({ handoff: 'active' })
      );
      mockPushEvent.mockClear();
      instrumentation = initSampled({}, 'session-a');
      emitCallback(metaEvent());

      expect(replayAttributes()).toEqual([expect.objectContaining({ recording_id: recordingId, gen: '1', seq: '2' })]);
    });

    it('should remove the same metas listener that it registered', () => {
      instrumentation = new ReplayInstrumentation();
      const faro = initializeFaro(mockConfig({ instrumentations: [] }));
      const addListenerSpy = jest.spyOn(faro.metas, 'addListener');
      const removeListenerSpy = jest.spyOn(faro.metas, 'removeListener');

      faro.instrumentations.add(instrumentation);
      const registeredListener = addListenerSpy.mock.calls[0]?.[0];

      faro.instrumentations.remove(instrumentation);

      expect(registeredListener).toBeDefined();
      expect(removeListenerSpy).toHaveBeenCalledWith(registeredListener);
    });
  });

  describe('destroy', () => {
    it('should stop recording and clean up when destroyed', () => {
      const stopFn = jest.fn();
      mockRecord.mockReturnValue(stopFn);

      instrumentation = new ReplayInstrumentation();

      // Mock sampled session
      mockGetSession.mockReturnValue({
        id: 'test-session',
        attributes: { isSampled: 'true' },
      });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(instrumentation['isRecording']).toBe(true);

      instrumentation.destroy();

      expect(stopFn).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
      expect(instrumentation['stopFn']).toBeNull();
    });

    it('should handle destroy when not recording', () => {
      instrumentation = new ReplayInstrumentation();

      expect(() => instrumentation.destroy()).not.toThrow();
      expect(instrumentation['isRecording']).toBe(false);
    });
  });

  describe('inactivity tracking', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    function initSampledInstrumentation(options: ReplayInstrumentationOptions = {}): ReplayInstrumentation {
      const inst = new ReplayInstrumentation(options);
      mockGetSession.mockReturnValue({ id: 'test-session', attributes: { isSampled: 'true' } });
      inst['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      inst['metas'] = { addListener: mockAddListener } as any;
      inst.initialize();
      return inst;
    }

    it('should pause recording after inactivity threshold elapses', () => {
      const stopFn = jest.fn();
      mockRecord.mockReturnValue(stopFn);

      instrumentation = initSampledInstrumentation({ inactivityThresholdMs: 5_000 });
      expect(instrumentation['isPaused']).toBe(false);

      jest.advanceTimersByTime(5_000);

      expect(stopFn).toHaveBeenCalled();
      expect(instrumentation['isPaused']).toBe(true);
      expect(mockPushEvent).toHaveBeenCalledWith('faro.session_recording.paused', {
        recording_id: expect.any(String),
      });
    });

    it('should resume recording with a fresh checkpoint when user interacts after pause', () => {
      const stopFn = jest.fn();
      mockRecord.mockReturnValue(stopFn);

      instrumentation = initSampledInstrumentation({ inactivityThresholdMs: 5_000 });

      jest.advanceTimersByTime(5_000);
      expect(instrumentation['isPaused']).toBe(true);
      expect(mockRecord).toHaveBeenCalledTimes(1);

      mockRecord.mockReturnValue(jest.fn());
      document.dispatchEvent(new Event('pointerdown'));

      expect(instrumentation['isPaused']).toBe(false);
      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(mockPushEvent).toHaveBeenCalledWith('faro.session_recording.resumed', {
        recording_id: expect.any(String),
      });
    });

    it('should not pause when inactivityThresholdMs is 0', () => {
      const stopFn = jest.fn();
      mockRecord.mockReturnValue(stopFn);

      instrumentation = initSampledInstrumentation({ inactivityThresholdMs: 0 });

      jest.advanceTimersByTime(120_000);

      expect(instrumentation['isPaused']).toBe(false);
      expect(stopFn).not.toHaveBeenCalled();
    });

    it('should not pause when inactivityThresholdMs is undefined', () => {
      const stopFn = jest.fn();
      mockRecord.mockReturnValue(stopFn);

      instrumentation = initSampledInstrumentation({ inactivityThresholdMs: undefined });

      jest.advanceTimersByTime(120_000);

      expect(instrumentation['isPaused']).toBe(false);
      expect(stopFn).not.toHaveBeenCalled();
    });

    it('should remove DOM listeners on stopRecording', () => {
      const removeSpy = jest.spyOn(document, 'removeEventListener');

      instrumentation = initSampledInstrumentation({ inactivityThresholdMs: 5_000 });
      instrumentation.destroy();

      const removedEvents = removeSpy.mock.calls.map((call) => call[0]);
      expect(removedEvents).toContain('pointermove');
      expect(removedEvents).toContain('pointerdown');
      expect(removedEvents).toContain('scroll');
      expect(removedEvents).toContain('keydown');
      expect(removedEvents).toContain('input');
    });

    it('should keep DOM listeners attached across pauseRecording', () => {
      const stopFn = jest.fn();
      mockRecord.mockReturnValue(stopFn);
      const removeSpy = jest.spyOn(document, 'removeEventListener');

      instrumentation = initSampledInstrumentation({ inactivityThresholdMs: 5_000 });

      jest.advanceTimersByTime(5_000);
      expect(instrumentation['isPaused']).toBe(true);

      const removedEvents = removeSpy.mock.calls.map((call) => call[0]);
      expect(removedEvents).not.toContain('pointermove');
      expect(removedEvents).not.toContain('pointerdown');

      mockRecord.mockReturnValue(jest.fn());
      document.dispatchEvent(new Event('scroll'));
      expect(instrumentation['isPaused']).toBe(false);
    });

    it('should reset the inactivity timer on user interaction', () => {
      const stopFn = jest.fn();
      mockRecord.mockReturnValue(stopFn);

      instrumentation = initSampledInstrumentation({ inactivityThresholdMs: 5_000 });

      jest.advanceTimersByTime(4_000);
      document.dispatchEvent(new Event('keydown'));

      jest.advanceTimersByTime(4_000);
      expect(instrumentation['isPaused']).toBe(false);

      jest.advanceTimersByTime(1_000);
      expect(instrumentation['isPaused']).toBe(true);
    });
  });

  describe('samplingRate', () => {
    // session-1 hashes to ≈ 0.142 — falls below 0.2 (included) and above 0.1 (excluded)
    // session-100 hashes to ≈ 0.827 — falls above 0.5 (excluded)
    // These values are derived from the djb2-style hash in hashSessionId().

    it('should record all sampled sessions when samplingRate is 1 (default)', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 1 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should never record when samplingRate is 0', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 0 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should record when session hash falls below samplingRate', () => {
      // session-1 hash ≈ 0.142 which is below 0.2
      instrumentation = new ReplayInstrumentation({ samplingRate: 0.2 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should not record when session hash falls above samplingRate', () => {
      // session-1 hash ≈ 0.142 which is above 0.1
      instrumentation = new ReplayInstrumentation({ samplingRate: 0.1 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should produce the same decision across page reloads for the same session ID', () => {
      // Simulates a page reload by creating a fresh instance with the same session ID.
      // The hash-based approach must produce the same outcome both times.
      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });

      instrumentation = new ReplayInstrumentation({ samplingRate: 0.2 });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;
      instrumentation.initialize();
      const firstDecision = instrumentation['isRecording'];

      const instrumentation2 = new ReplayInstrumentation({ samplingRate: 0.2 });
      instrumentation2['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation2['metas'] = { addListener: mockAddListener } as any;
      instrumentation2.initialize();
      const secondDecision = instrumentation2['isRecording'];
      instrumentation2.destroy();

      expect(firstDecision).toBe(secondDecision);
    });

    it('should clamp negative samplingRate to 0 and log a warning', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: -0.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      const logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');

      instrumentation.initialize();

      expect(logWarnSpy).toHaveBeenCalledWith(expect.stringContaining('clamping to'));
      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should clamp samplingRate > 1 to 1 and log a warning', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 1.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      const logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');

      instrumentation.initialize();

      expect(logWarnSpy).toHaveBeenCalledWith(expect.stringContaining('clamping to'));
      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should re-evaluate the sampling decision when session ID changes', () => {
      // session-1 hash ≈ 0.142 → included at 0.5; session-100 hash ≈ 0.827 → excluded at 0.5
      let metaListener: () => void;
      mockAddListener.mockImplementation((cb: () => void) => {
        metaListener = cb;
      });

      instrumentation = new ReplayInstrumentation({ samplingRate: 0.5 });
      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();
      expect(instrumentation['isRecording']).toBe(true);

      mockGetSession.mockReturnValue({ id: 'session-100', attributes: { isSampled: 'true' } });
      metaListener!();

      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should not record when both global sampling and samplingRate are inactive', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 0 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'false' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should keep hash values evenly distributed across multiple genShortID seeds', () => {
      const numBuckets = 10;
      const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const samplesPerSeed = 10_000;
      const numSamples = seeds.length * samplesPerSeed;
      const buckets = new Array(numBuckets).fill(0);
      const maxAllowedChiSquared = 21.67;
      const originalCrypto = globalThis.crypto;
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: {},
      });
      const randomSpy = jest.spyOn(Math, 'random');

      try {
        const inst = new ReplayInstrumentation();
        for (const seed of seeds) {
          randomSpy.mockImplementation(createSeededRandom(seed));

          for (let i = 0; i < samplesPerSeed; i++) {
            const hash = inst['hashSessionId'](genShortID());
            const bucket = Math.min(Math.floor(hash * numBuckets), numBuckets - 1);
            buckets[bucket]++;
          }
        }

        // Seed Math.random with several fixed seeds so the real genShortID() exercises a broader,
        // deterministic corpus. This uses chi-squared as a regression score, not as a p-value-based test.
        const expected = numSamples / numBuckets;
        const chiSquared = buckets.reduce((sum, observed) => {
          return sum + (observed - expected) ** 2 / expected;
        }, 0);

        expect(randomSpy).toHaveBeenCalled();
        expect(chiSquared).toBeLessThan(maxAllowedChiSquared);
      } finally {
        randomSpy.mockRestore();
        Object.defineProperty(globalThis, 'crypto', {
          configurable: true,
          value: originalCrypto,
        });
      }
    });

    it('should not start recording when session ID is null', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 1 });

      mockGetSession.mockReturnValue({ id: undefined, attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession, pushEvent: mockPushEvent } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });
  });
});
