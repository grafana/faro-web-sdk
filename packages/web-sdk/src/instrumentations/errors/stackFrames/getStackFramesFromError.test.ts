import { CapturedExceptions } from "./errorExamples";

import { getStackFramesFromError } from "./getStackFramesFromError";
import { buildStackFrame } from "./buildStackFrame";

jest.mock("./buildStackFrame", () => ({
  buildStackFrame: jest.fn((filename, func, lineno, colno) => ({ filename, func, lineno, colno })),
}));

jest.mock("./getDataFromSafariExtensions", () => ({
  getDataFromSafariExtensions: jest.fn((func, filename) => [func, filename]),
}));

describe("getStackFramesFromError", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle Chrome v15 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.CHROME_15);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "bar", 13, 17),
      buildStackFrame("http://path/to/file.js", "bar", 16, 5),
      buildStackFrame("http://path/to/file.js", "foo", 20, 5),
      buildStackFrame("http://path/to/file.js", undefined, 24, 4),
    ]);
  });

  it("should handle Chrome v36 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.CHROME_36);
    expect(result).toEqual([
      buildStackFrame("http://localhost:8080/file.js", "dumpExceptionError", 41, 27),
      buildStackFrame("http://localhost:8080/file.js", "HTMLButtonElement.onclick", 107, 146),
    ]);
  });

  it("should handle Chrome v48 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.CHROME_48_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame("http://localhost:8080/file.js", "baz", 21, 17),
      buildStackFrame("http://localhost:8080/file.js", "foo", 21, 17),
      buildStackFrame("http://localhost:8080/file.js", "eval", 21, 17),
      buildStackFrame("http://localhost:8080/file.js", "Object.speak", 21, 17),
      buildStackFrame("http://localhost:8080/file.js", undefined, 31, 13),
    ]);
  });

  it("should handle Firefox 3 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_3);
    expect(result).toEqual([
      buildStackFrame("http://127.0.0.1:8000/js/stacktrace.js", "", 44, undefined),
      buildStackFrame("http://127.0.0.1:8000/js/stacktrace.js", "", 31, undefined),
      buildStackFrame("http://127.0.0.1:8000/js/stacktrace.js", "printStackTrace", 18, undefined),
      buildStackFrame("http://127.0.0.1:8000/js/file.js", "bar", 13, undefined),
      buildStackFrame("http://127.0.0.1:8000/js/file.js", "bar", 16, undefined),
      buildStackFrame("http://127.0.0.1:8000/js/file.js", "foo", 20, undefined),
      buildStackFrame("http://127.0.0.1:8000/js/file.js", "", 24, undefined),
    ]);
  });

  it("should handle Firefox 7 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_7);
    expect(result).toEqual([
      buildStackFrame("file:///G:/js/stacktrace.js", "", 44, undefined),
      buildStackFrame("file:///G:/js/stacktrace.js", "", 31, undefined),
      buildStackFrame("file:///G:/js/stacktrace.js", "printStackTrace", 18, undefined),
      buildStackFrame("file:///G:/js/file.js", "bar", 13, undefined),
      buildStackFrame("file:///G:/js/file.js", "bar", 16, undefined),
      buildStackFrame("file:///G:/js/file.js", "foo", 20, undefined),
      buildStackFrame("file:///G:/js/file.js", "", 24, undefined),
    ]);
  });

  it("should handle Firefox 14 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_14);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "", 48, undefined),
      buildStackFrame("http://path/to/file.js", "dumpException3", 52, undefined),
      buildStackFrame("http://path/to/file.js", "onclick", 1, undefined),
    ]);
  });

  it("should handle Firefox 31 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_31);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "foo", 41, 13),
      buildStackFrame("http://path/to/file.js", "bar", 1, 1),
    ]);
  });

  it("should handle Firefox 43 traces with nested eval", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_43_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame("http://localhost:8080/file.js", "baz", 26, 30),
      buildStackFrame("http://localhost:8080/file.js", "foo", 26, 96),
      buildStackFrame("http://localhost:8080/file.js", "eval", 26, 18),
      buildStackFrame("http://localhost:8080/file.js", "speak", 26, 17),
      buildStackFrame("http://localhost:8080/file.js", "", 33, 9),
    ]);
  });

  it.skip("should handle Firefox 43 traces with @fn name", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_43_FUNCTION_NAME_WITH_AT_SIGN);
    expect(result).toEqual([
      buildStackFrame("http://localhost:8080/file.js", "baz", 26, 30),
      buildStackFrame("http://localhost:8080/file.js", "foo", 26, 96),
    ]);
  });

  it("should handle Firefox 60 traces with @url name", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_60_URL_WITH_AT_SIGN);
    expect(result).toEqual([
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "who", 3, 9),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "what", 6, 3),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "where", 9, 3),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "why", 12, 3),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "", 15, 1),
    ]);
  });

  it("should handle Firefox 60 traces with @url name and @fn name", () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_60_URL_AND_FUNCTION_NAME_WITH_AT_SIGN);
    expect(result).toEqual([
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "obj[\"@who\"]", 4, 9),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "what", 8, 3),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "where", 11, 3),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "why", 14, 3),
      buildStackFrame("http://localhost:5000/misc/@stuff/foo.js", "", 17, 1),
    ]);
  });

  it("should handle Safari 6 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_6);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "", 48, undefined),
      buildStackFrame("http://path/to/file.js", "dumpException3", 52, undefined),
      buildStackFrame("http://path/to/file.js", "onclick", 82, undefined),
      buildStackFrame("[native code]", "", undefined, undefined),
    ]);
  });

  it("should handle Safari 7 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_7);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "", 48, 22),
      buildStackFrame("http://path/to/file.js", "foo", 52, 15),
      buildStackFrame("http://path/to/file.js", "bar", 108, 107),
    ]);
  });

  it("should handle Safari 8 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_8);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "", 47, 22),
      buildStackFrame("http://path/to/file.js", "foo", 52, 15),
      buildStackFrame("http://path/to/file.js", "bar", 108, 23),
    ]);
  });

  it("should handle Safari 8 with eval traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_8_EVAL);
    expect(result).toEqual([
      buildStackFrame("[native code]", "eval", undefined, undefined),
      buildStackFrame("http://path/to/file.js", "foo", 58, 21),
      buildStackFrame("http://path/to/file.js", "bar", 109, 91),
    ]);
  });

  it("should handle Safari 9 with nested eval traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_9_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame("[native code]", "eval", undefined, undefined),
      buildStackFrame("http://localhost:8080/file.js", "speak", 26, 21),
      buildStackFrame("http://localhost:8080/file.js", "global code", 33, 18),
    ]);
  });

  it("should handle IE 10 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.IE_10);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "Anonymous function", 48, 13),
      buildStackFrame("http://path/to/file.js", "foo", 46, 9),
      buildStackFrame("http://path/to/file.js", "bar", 82, 1),
    ]);
  });

  it("should handle IE 11 traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.IE_11);
    expect(result).toEqual([
      buildStackFrame("http://path/to/file.js", "Anonymous function", 47, 21),
      buildStackFrame("http://path/to/file.js", "foo", 45, 13),
      buildStackFrame("http://path/to/file.js", "bar", 108, 1),
    ]);
  });

  it("should handle Edge 20 with nestede eval traces", () => {
    const result = getStackFramesFromError(CapturedExceptions.EDGE_20_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame("eval code", "baz", 1, 18),
      buildStackFrame("eval code", "foo", 2, 90),
      buildStackFrame("eval code", "eval code", 4, 18),
      buildStackFrame("http://localhost:8080/file.js", "speak", 25, 17),
      buildStackFrame("http://localhost:8080/file.js", "Global code", 32, 9),
    ]);
  });
});

