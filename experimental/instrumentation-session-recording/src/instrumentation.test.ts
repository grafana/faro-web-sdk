import { SessionRecordingInstrumentation } from './instrumentation';
import { SessionRecordingInstrumentationOptions } from './types';

// Mock rrweb
jest.mock('rrweb', () => ({
  record: jest.fn(),
}));

describe('SessionRecordingInstrumentation', () => {
  let instrumentation;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct name and version', () => {
    instrumentation = new SessionRecordingInstrumentation();

    expect(instrumentation.name).toBe('@grafana/faro-web-session-recording');
    expect(instrumentation.version).toBeDefined();
  });

  it('should use default options when none provided', () => {
    instrumentation = new SessionRecordingInstrumentation();

    const expectedDefaults: SessionRecordingInstrumentationOptions = {
      batchSize: 100,
      batchTimeout: 10000,
      sampling: false,
      samplingRate: 0.1,
      recordCrossOriginIframes: false,
      maskTextInputs: true,
      maskAllInputs: false,
      maskAllText: false,
      collectFonts: false,
      inlineImages: false,
      inlineStylesheet: false,
      recordCanvas: false,
      recordLogs: false,
    };

    expect(instrumentation['options']).toEqual(expectedDefaults);
  });

  it('should merge provided options with defaults', () => {
    const options: SessionRecordingInstrumentationOptions = {
      batchSize: 50,
      sampling: true,
      samplingRate: 0.2,
      maskAllText: true,
      maskTextInputs: false,
      recordLogs: true,
    };

    instrumentation = new SessionRecordingInstrumentation(options);

    expect(instrumentation['options'].batchSize).toBe(50);
    expect(instrumentation['options'].sampling).toBe(true);
    expect(instrumentation['options'].samplingRate).toBe(0.2);
    expect(instrumentation['options'].maskAllText).toBe(true);
    expect(instrumentation['options'].maskTextInputs).toBe(false);
    expect(instrumentation['options'].recordLogs).toBe(true);
    expect(instrumentation['options'].batchTimeout).toBe(10000); // default
  });

  it('should support all option types', () => {
    const options: SessionRecordingInstrumentationOptions = {
      batchSize: 200,
      batchTimeout: 5000,
      sampling: true,
      samplingRate: 0.5,
      recordCrossOriginIframes: true,
      maskTextInputs: false,
      maskAllInputs: true,
      maskAllText: true,
      maskSelector: '.sensitive',
      blockSelector: '.blocked',
      ignoreSelector: '.ignored',
      collectFonts: true,
      inlineImages: true,
      inlineStylesheet: true,
      recordCanvas: true,
      recordLogs: true,
      beforeRecord: jest.fn(),
      beforeSend: jest.fn(),
    };

    instrumentation = new SessionRecordingInstrumentation(options);

    expect(instrumentation['options']).toEqual(options);
  });
});

