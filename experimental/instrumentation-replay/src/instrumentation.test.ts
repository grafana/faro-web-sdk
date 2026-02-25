import { ReplayInstrumentation } from './instrumentation';
import { MaskInputFn, ReplayInstrumentationOptions } from './types';

// Mock rrweb
jest.mock('rrweb', () => ({
  record: jest.fn(),
}));

describe('ReplayInstrumentation', () => {
  let instrumentation: ReplayInstrumentation;
  let mockRecord: jest.Mock;
  let mockGetSession: jest.Mock;
  let mockAddListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord = require('rrweb').record;
    mockRecord.mockReturnValue(jest.fn());

    // Mock API and metas
    mockGetSession = jest.fn();
    mockAddListener = jest.fn();
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
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
        maskInputFn: undefined,
        collectFonts: false,
        inlineImages: false,
        inlineStylesheet: false,
        recordCanvas: false,
        maskTextSelector: undefined,
        blockSelector: undefined,
        ignoreSelector: undefined,
        beforeSend: undefined,
        samplingRate: 1,
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
        samplingRate: 1,
      };

      instrumentation = new ReplayInstrumentation(customOptions);

      expect(instrumentation['options']).toEqual(customOptions);
    });

    it('should merge partial custom options with defaults', () => {
      const partialOptions: ReplayInstrumentationOptions = {
        recordAfter: 'DOMContentLoaded',
        maskAllInputs: true,
        recordCanvas: true,
      };

      instrumentation = new ReplayInstrumentation(partialOptions);

      expect(instrumentation['options'].maskAllInputs).toBe(true);
      expect(instrumentation['options'].recordCanvas).toBe(true);

      // Defaults should still be present
      const expected: ReplayInstrumentationOptions = {
        recordCrossOriginIframes: false,
        recordAfter: 'DOMContentLoaded',
        maskAllInputs: true, // Overridden by partial options
        maskInputOptions: {
          password: true,
        },
        maskInputFn: undefined,
        collectFonts: false,
        inlineImages: false,
        inlineStylesheet: false,
        recordCanvas: true, // Overridden by partial options
        maskTextSelector: undefined,
        blockSelector: undefined,
        ignoreSelector: undefined,
        beforeSend: undefined,
        samplingRate: 1,
      };

      expect(instrumentation['options']).toEqual(expected);
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
      instrumentation['api'] = { getSession: mockGetSession } as any;
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
      instrumentation['api'] = { getSession: mockGetSession } as any;
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
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          recordAfter: 'load',
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
      instrumentation['api'] = { getSession: mockGetSession } as any;
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
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      const logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');

      expect(() => instrumentation.initialize()).not.toThrow();
      expect(logWarnSpy).toHaveBeenCalledWith('Failed to start session replay', expect.any(Error));
    });
  });

  describe('handleEvent', () => {
    let emitCallback: (event: any, isCheckout?: boolean) => void;
    let mockPushEvent: jest.Mock;

    beforeEach(() => {
      mockRecord.mockImplementation((opts) => {
        emitCallback = opts.emit;
        return jest.fn();
      });
      mockPushEvent = jest.fn();
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
      expect(mockPushEvent).not.toHaveBeenCalled();
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
      expect(mockPushEvent).not.toHaveBeenCalled();
    });

    it('should handle errors when pushing events gracefully', () => {
      mockPushEvent.mockImplementation(() => {
        throw new Error('Push failed');
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
      instrumentation['api'] = { getSession: mockGetSession } as any;
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

  describe('samplingRate', () => {
    it('should record all sampled sessions when samplingRate is 1 (default)', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 1 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should never record when samplingRate is 0', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 0 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should record when samplingRate is 0.5 and Math.random() is below threshold', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.3);

      instrumentation = new ReplayInstrumentation({ samplingRate: 0.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should not record when samplingRate is 0.5 and Math.random() is above threshold', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.7);

      instrumentation = new ReplayInstrumentation({ samplingRate: 0.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should clamp negative samplingRate to 0 and log a debug warning', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: -0.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      const logDebugSpy = jest.spyOn(instrumentation as any, 'logDebug');

      instrumentation.initialize();

      expect(logDebugSpy).toHaveBeenCalledWith(expect.stringContaining('clamping to'));
      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should clamp samplingRate > 1 to 1 and log a debug warning', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 1.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      const logDebugSpy = jest.spyOn(instrumentation as any, 'logDebug');

      instrumentation.initialize();

      expect(logDebugSpy).toHaveBeenCalledWith(expect.stringContaining('clamping to'));
      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should use a stable decision for the same session ID', () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.3);

      instrumentation = new ReplayInstrumentation({ samplingRate: 0.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      // Capture the listener registered by initialize
      let metaListener: () => void;
      mockAddListener.mockImplementation((cb: () => void) => {
        metaListener = cb;
      });

      instrumentation.initialize();
      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(randomSpy).toHaveBeenCalledTimes(1);

      // Simulate meta change with the same session — Math.random should NOT be re-rolled
      metaListener!();

      expect(mockRecord).toHaveBeenCalledTimes(1); // still recording, no new start
      expect(instrumentation['isRecording']).toBe(true);
      expect(randomSpy).toHaveBeenCalledTimes(1); // roll was skipped
    });

    it('should re-roll the sampling decision for a new session ID', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.3); // include

      instrumentation = new ReplayInstrumentation({ samplingRate: 0.5 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'true' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      let metaListener: () => void;
      mockAddListener.mockImplementation((cb: () => void) => {
        metaListener = cb;
      });

      instrumentation.initialize();
      expect(instrumentation['isRecording']).toBe(true);

      // Session rotates — new ID, Math.random now excludes
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      mockGetSession.mockReturnValue({ id: 'session-2', attributes: { isSampled: 'true' } });
      metaListener!();

      expect(instrumentation['isRecording']).toBe(false);
    });

    it('should not record when both global sampling and samplingRate are inactive', () => {
      instrumentation = new ReplayInstrumentation({ samplingRate: 0 });

      mockGetSession.mockReturnValue({ id: 'session-1', attributes: { isSampled: 'false' } });
      instrumentation['api'] = { getSession: mockGetSession } as any;
      instrumentation['metas'] = { addListener: mockAddListener } as any;

      instrumentation.initialize();

      expect(mockRecord).not.toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(false);
    });
  });
});
