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
      recordCrossOriginIframes: false,
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
      collectFonts: false,
      inlineImages: false,
      inlineStylesheet: false,
      recordCanvas: false,
    };

    expect(instrumentation['options']).toEqual(expectedDefaults);
  });
});
