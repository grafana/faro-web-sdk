// Drives the real rrweb, not a mock. The fix depends entirely on rrweb's
// `callbackWrapper` semantics: it catches, hands the error to our `errorHandler`,
// and rethrows unless the handler returns `true`. Asserting that against a mocked
// `record` would only test our reading of rrweb, so these tests let rrweb patch a
// real API and then call it from "the app".
import { ReplayInstrumentation } from './instrumentation';

const OBSERVED_MESSAGE = 'Session replay caught an error thrown by the page';

describe('rrweb errorHandler, through real rrweb', () => {
  let instrumentation: ReplayInstrumentation;
  let logWarnSpy: jest.SpyInstance;
  let logErrorSpy: jest.SpyInstance;
  let nativeInsertRule: typeof CSSStyleSheet.prototype.insertRule;
  let styleEl: HTMLStyleElement;

  // Make the underlying API throw, so the failure is deterministic rather than
  // depending on how strictly the environment's CSS parser rejects a selector.
  const thrownError = (): DOMException =>
    new DOMException("Failed to execute 'insertRule' on 'CSSStyleSheet'", 'SyntaxError');

  beforeEach(() => {
    nativeInsertRule = CSSStyleSheet.prototype.insertRule;
    CSSStyleSheet.prototype.insertRule = function (): number {
      throw thrownError();
    };

    styleEl = document.createElement('style');
    document.head.appendChild(styleEl);

    instrumentation = new ReplayInstrumentation({ recordAfter: 'DOMContentLoaded', inactivityThresholdMs: 0 });
    instrumentation['api'] = {
      getSession: jest.fn().mockReturnValue({ id: 'test-session', attributes: { isSampled: 'true' } }),
      pushEvent: jest.fn(),
    } as any;
    instrumentation['metas'] = {
      addListener: jest.fn(),
      capture: (callback?: () => void) => {
        callback?.();
        return { session: { id: 'test-session' } };
      },
    } as any;

    logWarnSpy = jest.spyOn(instrumentation as any, 'logWarn');
    logErrorSpy = jest.spyOn(instrumentation as any, 'logError');

    instrumentation.initialize();
  });

  afterEach(() => {
    instrumentation.destroy();
    CSSStyleSheet.prototype.insertRule = nativeInsertRule;
    styleEl.remove();
    jest.restoreAllMocks();
  });

  function observedWarnings(): unknown[][] {
    return logWarnSpy.mock.calls.filter((call) => String(call[0]).includes(OBSERVED_MESSAGE));
  }

  it('rethrows, so the caller still sees the failure it would have seen without replay', () => {
    expect(() => styleEl.sheet!.insertRule('.a{color:red}', 0)).toThrow(
      expect.objectContaining({ name: 'SyntaxError' })
    );
  });

  it('logs the failure once at warn level, however many times the page repeats it', () => {
    for (let i = 0; i < 10; i++) {
      expect(() => styleEl.sheet!.insertRule('.a{color:red}', 0)).toThrow();
    }

    expect(observedWarnings()).toHaveLength(1);
    expect(logErrorSpy).not.toHaveBeenCalled();
  });

  it('keeps recording after the page throws', () => {
    expect(() => styleEl.sheet!.insertRule('.a{color:red}', 0)).toThrow();

    expect(instrumentation['isRecording']).toBe(true);
  });
});
