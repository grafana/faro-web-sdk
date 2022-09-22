export const newLineString = '\n';
export const evalString = 'eval';
export const unknownString = '?';
export const atString = '@';

export const webkitLineRegex =
  /^\s*at (?:(.*\).*?|.*?) ?\((?:address at )?)?((?:file|https?|blob|chrome-extension|address|native|eval|webpack|<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
export const webkitEvalRegex = /\((\S*)(?::(\d+))(?::(\d+))\)/;
export const webkitEvalString = 'eval';
export const webkitAddressAtString = 'address at ';
export const webkitAddressAtStringLength = webkitAddressAtString.length;

export const firefoxLineRegex =
  /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:file|https?|blob|chrome|webpack|resource|moz-extension|safari-extension|safari-web-extension|capacitor)?:\/.*?|\[native code]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
export const firefoxEvalRegex = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
export const firefoxEvalString = ' > eval';

export const safariExtensionString = 'safari-extension';
export const safariWebExtensionString = 'safari-web-extension';

export const reactMinifiedRegex = /Minified React error #\d+;/i;
