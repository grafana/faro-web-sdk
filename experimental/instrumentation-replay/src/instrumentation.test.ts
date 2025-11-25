import { ReplayInstrumentation } from './instrumentation';
import { ReplayInstrumentationOptions } from './types';

// Mock rrweb
jest.mock('rrweb', () => ({
  record: jest.fn(),
}));

describe('ReplayInstrumentation', () => {
  let instrumentation: ReplayInstrumentation;
  let mockRecord: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord = require('rrweb').record;
    mockRecord.mockReturnValue(jest.fn());
  });

  afterEach(() => {
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
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
        collectFonts: false,
        inlineImages: false,
        inlineStylesheet: false,
        recordCanvas: false,
        maskTextSelector: undefined,
        blockSelector: undefined,
        ignoreSelector: undefined,
        beforeSend: undefined,
      };

      expect(instrumentation['options']).toEqual(expectedDefaults);
    });

    it('should use custom options when provided', () => {
      const beforeSendFn = jest.fn();
      const customOptions: ReplayInstrumentationOptions = {
        recordCrossOriginIframes: true,
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true,
        },
        collectFonts: true,
        inlineImages: true,
        inlineStylesheet: true,
        recordCanvas: true,
        maskTextSelector: '.mask-me',
        blockSelector: '.block-me',
        ignoreSelector: '.ignore-me',
        beforeSend: beforeSendFn,
      };

      instrumentation = new ReplayInstrumentation(customOptions);

      expect(instrumentation['options']).toEqual(customOptions);
    });

    it('should merge partial custom options with defaults', () => {
      const partialOptions: ReplayInstrumentationOptions = {
        maskAllInputs: true,
        recordCanvas: true,
      };

      instrumentation = new ReplayInstrumentation(partialOptions);

      expect(instrumentation['options'].maskAllInputs).toBe(true);
      expect(instrumentation['options'].recordCanvas).toBe(true);

      // Defaults should still be present
      const expected: ReplayInstrumentationOptions = {
        recordCrossOriginIframes: false,
        maskAllInputs: true, // Overridden by partial options
        maskInputOptions: {
          password: true,
        },
        collectFonts: false,
        inlineImages: false,
        inlineStylesheet: false,
        recordCanvas: true, // Overridden by partial options
        maskTextSelector: undefined,
        blockSelector: undefined,
        ignoreSelector: undefined,
        beforeSend: undefined,
      };

      expect(instrumentation['options']).toEqual(expected);
    });
  });

  describe('initialize', () => {
    it('should start recording when initialized', () => {
      instrumentation = new ReplayInstrumentation();
      instrumentation.initialize();

      expect(mockRecord).toHaveBeenCalled();
      expect(instrumentation['isRecording']).toBe(true);
    });

    it('should warn and not restart if already recording', () => {
      instrumentation = new ReplayInstrumentation();
      const logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');

      instrumentation.initialize();
      instrumentation.initialize(); // Second call

      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(logWarnSpy).toHaveBeenCalledWith('Session replay is already running');
    });

    it('should pass correct options to rrweb record', () => {
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
      };

      instrumentation = new ReplayInstrumentation(customOptions);
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
      instrumentation['api'] = { pushEvent: mockPushEvent } as any;
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
      instrumentation['api'] = { pushEvent: mockPushEvent } as any;
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
      instrumentation['api'] = { pushEvent: mockPushEvent } as any;
      instrumentation.initialize();

      emitCallback({ type: 1, data: {}, timestamp: Date.now() });

      expect(beforeSend).toHaveBeenCalled();
      expect(mockPushEvent).not.toHaveBeenCalled();
    });

    it('should skip sending event if beforeSend returns undefined', () => {
      const beforeSend = jest.fn(() => undefined);

      instrumentation = new ReplayInstrumentation({ beforeSend });
      instrumentation['api'] = { pushEvent: mockPushEvent } as any;
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
      instrumentation['api'] = { pushEvent: mockPushEvent } as any;
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
});
