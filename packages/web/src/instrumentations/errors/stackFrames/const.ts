export const newLineString = '\n';
export const evalString = 'eval';
export const unknownString = '?';
export const atString = '@';

export const chromeLineRegex =
  /^\s*at (?:(.*?) ?\()?((?:file|https?|blob|chrome-extension|address|native|eval|webpack|<anonymous>|[-a-z]+:|.*bundle|\/).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
export const chromeEvalRegex = /\((\S*)::(\d+)::(\d+)\)/;
export const chromeEvalString = 'eval';
export const chromeAddressAtString = 'address at ';
export const chromeAddressAtStringLength = chromeAddressAtString.length;

export const msLineRegex =
  /^\s*at (?:((?:\[object object])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;

export const firefoxLineRegex =
  /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:file|https?|blob|chrome|webpack|resource|moz-extension|capacitor).*?:\/.*?|\[native code]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
export const firefoxEvalRegex = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
export const firefoxEvalString = ' > eval';

export const opera10LineRegex = / line (\d+).*script (?:in )?(\S+)(?:: in function (\S+))?$/i;
export const opera11LineRegex =
  / line (\d+), column (\d+)\s*(?:in (?:<anonymous function: ([^>]+)>|([^)]+))\((.*)\))? in (.*):\s*$/i;

export const safariExtensionString = 'safari-extension';
export const safariWebExtensionString = 'safari-web-extension';

export const reactMinifiedRegex = /Minified React error #\d+;/i;
