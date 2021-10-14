export interface ExtendedError extends Error {
  columnNumber?: number;
  framesToPop?: number;
  stacktrace?: Error['stack'];
}

export interface StackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;
}

export const newLineString = '\n';
export const evalString = 'eval';
export const unknownString = '?';
export const framesToPopString = 'framesToPop';
export const atString = '@';
export const numberString = 'number';

export const chromeLineRegex =
  /^\s*at (?:(.*?) ?\()?((?:file|https?|blob|chrome-extension|address|native|eval|webpack|<anonymous>|[-a-z]+:|.*bundle|\/).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
export const chromeEvalRegex = /\((\S*)(?::(\d+))(?::(\d+))\)/;
export const chromeEvalString = 'eval';
export const chromeAddressAtString = 'address at ';
export const chromeAddressAtStringLength = chromeAddressAtString.length;

export const msLineRegex =
  /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;

export const firefoxLineRegex =
  /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:file|https?|blob|chrome|webpack|resource|moz-extension|capacitor).*?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
export const firefoxEvalRegex = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
export const firefoxEvalString = ' > eval';

export const opera10LineRegex = / line (\d+).*script (?:in )?(\S+)(?:: in function (\S+))?$/i;
export const opera11LineRegex =
  / line (\d+), column (\d+)\s*(?:in (?:<anonymous function: ([^>]+)>|([^)]+))\((.*)\))? in (.*):\s*$/i;

export const safariExtensionString = 'safari-extension';
export const safariWebExtensionString = 'safari-web-extension';

export const reactMinifiedRegex = /Minified React error #\d+;/i;

function handleSafariExtensions(func: string | null, filename: string | null): [string | null, string | null] {
  const isSafariExtension = func?.includes(safariExtensionString);
  const isSafariWebExtension = !isSafariExtension && func?.includes(safariWebExtensionString);

  if (!isSafariExtension && !isSafariWebExtension) {
    return [func, filename];
  }

  return [
    func?.includes(atString) ? func.split(atString)[0] || null : func,
    isSafariExtension ? `${safariExtensionString}:${filename}` : `${safariWebExtensionString}:${filename}`,
  ];
}

export function getStackFrames(error: ExtendedError): StackFrame[] {
  let lines: string[] = [];

  if (error.stacktrace) {
    lines = error.stacktrace.split(newLineString).filter((_line, idx) => idx % 2 === 0);
  } else if (error.stack) {
    lines = error.stack.split(newLineString);
  }

  const stackFrames = lines.reduce((arr, line, idx) => {
    let parts: RegExpExecArray | null;
    let func: string | null = null;
    let filename: string | null = null;
    let lineno: string | null = null;
    let colno: string | null = null;

    if ((parts = chromeLineRegex.exec(line))) {
      func = parts[1] || null;
      filename = parts[2] || null;
      lineno = parts[3] || null;
      colno = parts[4] || null;

      if (filename?.startsWith(chromeEvalString)) {
        const submatch = chromeEvalRegex.exec(filename);

        if (submatch) {
          filename = submatch[1] || null;
          lineno = submatch[2] || null;
          colno = submatch[3] || null;
        }
      }

      filename = filename?.startsWith(chromeAddressAtString) ? filename.substr(chromeAddressAtStringLength) : filename;
      [func, filename] = handleSafariExtensions(func, filename);
    } else if ((parts = msLineRegex.exec(line))) {
      func = parts[1] || null;
      filename = parts[2] || null;
      lineno = parts[3] || null;
      colno = parts[4] || null;
    } else if ((parts = firefoxLineRegex.exec(line))) {
      func = parts[1] || null;
      filename = parts[3] || null;
      lineno = parts[4] || null;
      colno = parts[5] || null;

      if (!!filename && filename.includes(firefoxEvalString)) {
        const submatch = firefoxEvalRegex.exec(filename);

        if (submatch) {
          func = func || evalString;
          filename = submatch[1] || null;
          lineno = submatch[2] || null;
        }
      } else if (idx === 0 && colno === null && typeof error.columnNumber === numberString) {
        colno = String(error.columnNumber! + 1);
      }

      [func, filename] = handleSafariExtensions(func, filename);
    } else if ((parts = opera10LineRegex.exec(line))) {
      filename = parts[2] || null;
      func = parts[3] || null;
      lineno = parts[1] || null;
    } else if ((parts = opera11LineRegex.exec(line))) {
      filename = parts[6] || null;
      func = parts[3] || parts[4] || null;
      lineno = parts[1] || null;
      colno = parts[2] || null;
    }

    if (filename !== null || func !== null) {
      const stackFrame: StackFrame = {
        filename: filename || unknownString,
        function: func || unknownString,
      };

      if (lineno !== null) {
        stackFrame.lineno = Number(lineno);
      }

      if (colno !== null) {
        stackFrame.colno = Number(colno);
      }

      arr.push(stackFrame);
    }

    return arr;
  }, [] as StackFrame[]);

  if (typeof error.framesToPop === numberString) {
    return stackFrames.slice(error.framesToPop);
  }

  if (reactMinifiedRegex.test(error.message)) {
    return stackFrames.slice(1);
  }

  return stackFrames;
}
