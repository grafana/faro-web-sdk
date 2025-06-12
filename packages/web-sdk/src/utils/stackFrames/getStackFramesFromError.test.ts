import { buildStackFrame } from './buildStackFrame';
import { getStackFramesFromError } from './getStackFramesFromError';
import {hrtime} from 'node:process';

jest.mock('./buildStackFrame', () => ({
  buildStackFrame: jest.fn((filename, func, lineno, colno) => ({ filename, func, lineno, colno })),
}));

jest.mock('./getDataFromSafariExtensions', () => ({
  getDataFromSafariExtensions: jest.fn((func, filename) => [func, filename]),
}));

describe('getStackFramesFromError', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle Chrome v36 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.CHROME_36);
    expect(result).toEqual([
      buildStackFrame('http://localhost:8080/file.js', 'dumpExceptionError', 41, 27),
      buildStackFrame('http://localhost:8080/file.js', 'HTMLButtonElement.onclick', 107, 146),
    ]);
  });

  it('should handle Chrome v48 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.CHROME_48_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame('http://localhost:8080/file.js', 'baz', 21, 17),
      buildStackFrame('http://localhost:8080/file.js', 'foo', 21, 17),
      buildStackFrame('http://localhost:8080/file.js', 'eval', 21, 17),
      buildStackFrame('http://localhost:8080/file.js', 'Object.speak', 21, 17),
      buildStackFrame('http://localhost:8080/file.js', undefined, 31, 13),
    ]);
  });

  it('should handle Firefox 43 traces with nested eval', () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_43_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame('http://localhost:8080/file.js', 'baz', 26, 30),
      buildStackFrame('http://localhost:8080/file.js', 'foo', 26, 96),
      buildStackFrame('http://localhost:8080/file.js', 'eval', 26, 18),
      buildStackFrame('http://localhost:8080/file.js', 'speak', 26, 17),
      buildStackFrame('http://localhost:8080/file.js', '', 33, 9),
    ]);
  });

  it.skip('should handle Firefox 43 traces with @fn name', () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_43_FUNCTION_NAME_WITH_AT_SIGN);
    expect(result).toEqual([
      buildStackFrame('http://localhost:8080/file.js', 'baz', 26, 30),
      buildStackFrame('http://localhost:8080/file.js', 'foo', 26, 96),
    ]);
  });

  it('should handle Firefox 60 traces with @url name', () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_60_URL_WITH_AT_SIGN);
    expect(result).toEqual([
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'who', 3, 9),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'what', 6, 3),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'where', 9, 3),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'why', 12, 3),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', '', 15, 1),
    ]);
  });

  it('should handle Firefox 60 traces with @url name and @fn name', () => {
    const result = getStackFramesFromError(CapturedExceptions.FIREFOX_60_URL_AND_FUNCTION_NAME_WITH_AT_SIGN);
    expect(result).toEqual([
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'obj["@who"]', 4, 9),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'what', 8, 3),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'where', 11, 3),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', 'why', 14, 3),
      buildStackFrame('http://localhost:5000/misc/@stuff/foo.js', '', 17, 1),
    ]);
  });

  it('should handle Safari 6 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_6);
    expect(result).toEqual([
      buildStackFrame('http://path/to/file.js', '', 48, undefined),
      buildStackFrame('http://path/to/file.js', 'dumpException3', 52, undefined),
      buildStackFrame('http://path/to/file.js', 'onclick', 82, undefined),
      buildStackFrame('[native code]', '', undefined, undefined),
    ]);
  });

  it('should handle Safari 7 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_7);
    expect(result).toEqual([
      buildStackFrame('http://path/to/file.js', '', 48, 22),
      buildStackFrame('http://path/to/file.js', 'foo', 52, 15),
      buildStackFrame('http://path/to/file.js', 'bar', 108, 107),
    ]);
  });

  it('should handle Safari 8 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_8);
    expect(result).toEqual([
      buildStackFrame('http://path/to/file.js', '', 47, 22),
      buildStackFrame('http://path/to/file.js', 'foo', 52, 15),
      buildStackFrame('http://path/to/file.js', 'bar', 108, 23),
    ]);
  });

  it('should handle Safari 8 with eval traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_8_EVAL);
    expect(result).toEqual([
      buildStackFrame('[native code]', 'eval', undefined, undefined),
      buildStackFrame('http://path/to/file.js', 'foo', 58, 21),
      buildStackFrame('http://path/to/file.js', 'bar', 109, 91),
    ]);
  });

  it('should handle Safari 9 with nested eval traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.SAFARI_9_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame('[native code]', 'eval', undefined, undefined),
      buildStackFrame('http://localhost:8080/file.js', 'speak', 26, 21),
      buildStackFrame('http://localhost:8080/file.js', 'global code', 33, 18),
    ]);
  });

  it('should handle IE 10 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.IE_10);
    expect(result).toEqual([
      buildStackFrame('http://path/to/file.js', 'Anonymous function', 48, 13),
      buildStackFrame('http://path/to/file.js', 'foo', 46, 9),
      buildStackFrame('http://path/to/file.js', 'bar', 82, 1),
    ]);
  });

  it('should handle IE 11 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.IE_11);
    expect(result).toEqual([
      buildStackFrame('http://path/to/file.js', 'Anonymous function', 47, 21),
      buildStackFrame('http://path/to/file.js', 'foo', 45, 13),
      buildStackFrame('http://path/to/file.js', 'bar', 108, 1),
    ]);
  });

  it('should handle Edge 20 with nested eval traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.EDGE_20_NESTED_EVAL);
    expect(result).toEqual([
      buildStackFrame('eval code', 'baz', 1, 18),
      buildStackFrame('eval code', 'foo', 2, 90),
      buildStackFrame('eval code', 'eval code', 4, 18),
      buildStackFrame('http://localhost:8080/file.js', 'speak', 25, 17),
      buildStackFrame('http://localhost:8080/file.js', 'Global code', 32, 9),
    ]);
  });

  it('should handle Opera 25 traces', () => {
    const result = getStackFramesFromError(CapturedExceptions.OPERA_25);
    expect(result).toEqual([
      buildStackFrame('http://path/to/file.js', undefined, 47, 22),
      buildStackFrame('http://path/to/file.js', 'foo', 52, 15),
      buildStackFrame('http://path/to/file.js', 'bar', 108, 168),
    ]);
  });

  it('should correctly skip long lines if configured to', ()=> {
    var start = hrtime();
    const result = getStackFramesFromError(CapturedExceptions.SUPER_LONG_LINE, {maximumLineLength: 256});
    const elapsed = hrtime(start)[1] / 1000000
    expect(elapsed).toBeLessThan(0.5);
    expect(result).toEqual([
      buildStackFrame('http://localhost:5173/node_modules/.vite/deps/chunk-RH76XVE4.js?v=3214fecf', 'getTransactionError',  1619, 10),
      buildStackFrame('http://localhost:5173/node_modules/.vite/deps/chunk-RH76XVE4.js?v=3214fecf', 'sendTransaction', 1750, 11),
      buildStackFrame('http://localhost:5173/src/app/hooks/useSwapRouter.tsx?t=1737523345399', 'async Object.executeTxn', 450, 24),
    ]);
  })
});

/* Taken from: https://github.com/stacktracejs/error-stack-parser/blob/master/spec/fixtures/captured-errors.js */
const CapturedExceptions: any = {};

CapturedExceptions.OPERA_25 = {
  message: "Cannot read property 'undef' of null",
  name: 'TypeError',
  stack:
    "TypeError: Cannot read property 'undef' of null\n" +
    '    at http://path/to/file.js:47:22\n' +
    '    at foo (http://path/to/file.js:52:15)\n' +
    '    at bar (http://path/to/file.js:108:168)',
};

CapturedExceptions.CHROME_36 = {
  message: 'Default error',
  name: 'Error',
  stack:
    'Error: Default error\n' +
    '    at dumpExceptionError (http://localhost:8080/file.js:41:27)\n' +
    '    at HTMLButtonElement.onclick (http://localhost:8080/file.js:107:146)',
};

CapturedExceptions.CHROME_46 = {
  message: 'Default error',
  name: 'Error',
  stack:
    'Error: Default error\n' +
    '    at new CustomError (http://localhost:8080/file.js:41:27)\n' +
    '    at HTMLButtonElement.onclick (http://localhost:8080/file.js:107:146)',
};

CapturedExceptions.CHROME_48_NESTED_EVAL = {
  message: 'message string',
  name: 'Error',
  stack:
    'Error: message string\n' +
    'at baz (eval at foo (eval at speak (http://localhost:8080/file.js:21:17)), <anonymous>:1:30)\n' +
    'at foo (eval at speak (http://localhost:8080/file.js:21:17), <anonymous>:2:96)\n' +
    'at eval (eval at speak (http://localhost:8080/file.js:21:17), <anonymous>:4:18)\n' +
    'at Object.speak (http://localhost:8080/file.js:21:17)\n' +
    'at http://localhost:8080/file.js:31:13\n',
};

CapturedExceptions.FIREFOX_43_NESTED_EVAL = {
  columnNumber: 30,
  fileName: 'http://localhost:8080/file.js line 25 > eval line 2 > eval',
  lineNumber: 1,
  message: 'message string',
  stack:
    'baz@http://localhost:8080/file.js line 26 > eval line 2 > eval:1:30\n' +
    'foo@http://localhost:8080/file.js line 26 > eval:2:96\n' +
    '@http://localhost:8080/file.js line 26 > eval:4:18\n' +
    'speak@http://localhost:8080/file.js:26:17\n' +
    '@http://localhost:8080/file.js:33:9',
};

CapturedExceptions.FIREFOX_43_FUNCTION_NAME_WITH_AT_SIGN = {
  message: 'Dummy error',
  name: 'Error',
  stack: 'obj["@fn"]@Scratchpad/1:10:29\n' + '@Scratchpad/1:11:1\n' + '',
  fileName: 'Scratchpad/1',
  lineNumber: 10,
  columnNumber: 29,
};

CapturedExceptions.FIREFOX_60_URL_WITH_AT_SIGN = {
  message: 'culprit',
  name: 'Error',
  stack:
    'who@http://localhost:5000/misc/@stuff/foo.js:3:9\n' +
    'what@http://localhost:5000/misc/@stuff/foo.js:6:3\n' +
    'where@http://localhost:5000/misc/@stuff/foo.js:9:3\n' +
    'why@http://localhost:5000/misc/@stuff/foo.js:12:3\n' +
    '@http://localhost:5000/misc/@stuff/foo.js:15:1\n',
  fileName: 'http://localhost:5000/misc/@stuff/foo.js',
  lineNumber: 3,
  columnNumber: 9,
};

CapturedExceptions.FIREFOX_60_URL_AND_FUNCTION_NAME_WITH_AT_SIGN = {
  message: 'culprit',
  name: 'Error',
  stack:
    'obj["@who"]@http://localhost:5000/misc/@stuff/foo.js:4:9\n' +
    'what@http://localhost:5000/misc/@stuff/foo.js:8:3\n' +
    'where@http://localhost:5000/misc/@stuff/foo.js:11:3\n' +
    'why@http://localhost:5000/misc/@stuff/foo.js:14:3\n' +
    '@http://localhost:5000/misc/@stuff/foo.js:17:1\n',
  fileName: 'http://localhost:5000/misc/@stuff/foo.js',
  lineNumber: 4,
  columnNumber: 9,
};

CapturedExceptions.SAFARI_6 = {
  message: "'null' is not an object (evaluating 'x.undef')",
  stack:
    '@http://path/to/file.js:48\n' +
    'dumpException3@http://path/to/file.js:52\n' +
    'onclick@http://path/to/file.js:82\n' +
    '[native code]',
  line: 48,
  sourceURL: 'http://path/to/file.js',
};

CapturedExceptions.SAFARI_7 = {
  message: "'null' is not an object (evaluating 'x.undef')",
  name: 'TypeError',
  stack: 'http://path/to/file.js:48:22\n' + 'foo@http://path/to/file.js:52:15\n' + 'bar@http://path/to/file.js:108:107',
  line: 47,
  sourceURL: 'http://path/to/file.js',
};

CapturedExceptions.SAFARI_8 = {
  message: "null is not an object (evaluating 'x.undef')",
  name: 'TypeError',
  stack: 'http://path/to/file.js:47:22\n' + 'foo@http://path/to/file.js:52:15\n' + 'bar@http://path/to/file.js:108:23',
  line: 47,
  column: 22,
  sourceURL: 'http://path/to/file.js',
};

CapturedExceptions.SAFARI_8_EVAL = {
  message: "Can't find variable: getExceptionProps",
  name: 'ReferenceError',
  stack:
    'eval code\n' + 'eval@[native code]\n' + 'foo@http://path/to/file.js:58:21\n' + 'bar@http://path/to/file.js:109:91',
  line: 1,
  column: 18,
};

CapturedExceptions.SAFARI_9_NESTED_EVAL = {
  column: 39,
  line: 1,
  message: 'message string',
  stack:
    'baz\n' +
    'foo\n' +
    'eval code\n' +
    'eval@[native code]\n' +
    'speak@http://localhost:8080/file.js:26:21\n' +
    'global code@http://localhost:8080/file.js:33:18',
};

CapturedExceptions.IE_9 = {
  message: "Unable to get property 'undef' of undefined or null reference",
  description: "Unable to get property 'undef' of undefined or null reference",
};

CapturedExceptions.IE_10 = {
  message: "Unable to get property 'undef' of undefined or null reference",
  stack:
    "TypeError: Unable to get property 'undef' of undefined or null reference\n" +
    '   at Anonymous function (http://path/to/file.js:48:13)\n' +
    '   at foo (http://path/to/file.js:46:9)\n' +
    '   at bar (http://path/to/file.js:82:1)',
  description: "Unable to get property 'undef' of undefined or null reference",
  number: -2146823281,
};

CapturedExceptions.IE_11 = {
  message: "Unable to get property 'undef' of undefined or null reference",
  name: 'TypeError',
  stack:
    "TypeError: Unable to get property 'undef' of undefined or null reference\n" +
    '   at Anonymous function (http://path/to/file.js:47:21)\n' +
    '   at foo (http://path/to/file.js:45:13)\n' +
    '   at bar (http://path/to/file.js:108:1)',
  description: "Unable to get property 'undef' of undefined or null reference",
  number: -2146823281,
};

CapturedExceptions.EDGE_20_NESTED_EVAL = {
  description: 'message string',
  message: 'message string',
  name: 'Error',
  stack:
    'Error: message string\n' +
    '  at baz (eval code:1:18)\n' +
    '  at foo (eval code:2:90)\n' +
    '  at eval code (eval code:4:18)\n' +
    '  at speak (http://localhost:8080/file.js:25:17)\n' +
    '  at Global code (http://localhost:8080/file.js:32:9)',
};

CapturedExceptions.NODE_WITH_SPACES = {
  name: 'Error',
  message: '',
  stack:
    'Error\n     at /var/app/scratch/my ' +
    'project/index.js:2:9\n    at Object.<anonymous> ' +
    '(/var/app/scratch/my ' +
    'project/index.js:2:9)\n    at Module._compile ' +
    '(internal/modules/cjs/loader.js:774:30)\n    at ' +
    'Object.Module._extensions..js (internal/modules/cjs/loader.js:785:10)\n   ' +
    ' at Module.load (internal/modules/cjs/loader.js:641:32)\n    at ' +
    'Function.Module._load (internal/modules/cjs/loader.js:556:12)\n    at ' +
    'Function.Module.runMain (internal/modules/cjs/loader.js:837:10)\n    at ' +
    'internal/main/run_main_module.js:17:11',
};

CapturedExceptions.SUPER_LONG_LINE = {
  description: "message string",
  message: 'message string',
  name: 'Error',
  stack:`TransactionExecutionError: User rejected the request.

Request Arguments:
  from:   0xB770B86b1544eDf51BBf82Dd01e8e867607Dba51
  to:     0x6352a56caadC4F1E25CD6c75970Fa768A3304e64
  value:  0 ETH
  data:   0x90411a320000000000000000000000002691f337abeb0146f16441ca4f82f363275851d5000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff8500000000000000000000000042000000000000000000000000000000000000060000000000000000000000002691f337abeb0146f16441ca4f82f363275851d5000000000000000000000000b770b86b1544edf51bbf82dd01e8e867607dba510000000000000000000000000000000000000000000000000000000000989680000000000000000000000000000000000000000000000000000a9c0ba2e15270000000000000000000000000000000000000000000000000000aa9b1a4fc2ed50000000000000000000000000000000000000000000000000000000000000002000000000000000000000000de219fe970acbc88c63c9c4d0705837c6701495f00000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000104e5b07cdb000000000000000000000000478946bcd4a5a22b316470f5486fafb928c0ba25000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000009896800000000000000000000000002691f337abeb0146f16441ca4f82f363275851d500000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002e0b2c639c533813f4aa9d7837caf62653d097ff85000064420000000000000000000000000000000000000600002e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000648a6a1e850000000000000000000000004200000000000000000000000000000000000006000000000000000000000000922164bbbd36acf9e854acbbf32facc949fcaeef000000000000000000000000000000000000000000000000000aa9b1a4fc2ed500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001a49f865422000000000000000000000000420000000000000000000000000000000000000600000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000064d1660f990000000000000000000000004200000000000000000000000000000000000006000000000000000000000000b770b86b1544edf51bbf82dd01e8e867607dba5100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
  gas:    467935

Details: MetaMask Tx Signature: User denied transaction signature.
Version: viem@2.22.11
    at getTransactionError (http://localhost:5173/node_modules/.vite/deps/chunk-RH76XVE4.js?v=3214fecf:1619:10)
    at sendTransaction (http://localhost:5173/node_modules/.vite/deps/chunk-RH76XVE4.js?v=3214fecf:1750:11)
    at async Object.executeTxn (http://localhost:5173/src/app/hooks/useSwapRouter.tsx?t=1737523345399:450:24)`
};


