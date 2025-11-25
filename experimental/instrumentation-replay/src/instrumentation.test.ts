import { ReplayInstrumentation } from './instrumentation';
import { ReplayInstrumentationOptions } from './types';

// Mock rrweb
jest.mock('rrweb', () => ({
  record: jest.fn(),
}));

describe('ReplayInstrumentation', () => {
  let instrumentation;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      maskSelector: undefined,
      blockSelector: undefined,
      ignoreSelector: undefined,
      beforeSend: undefined,
    };

    expect(instrumentation['options']).toEqual(expectedDefaults);
  });
});
