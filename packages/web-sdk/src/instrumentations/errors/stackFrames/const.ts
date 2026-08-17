export const newLineString = '\n';
export const evalString = 'eval';
export const unknownSymbolString = '?';
export const atString = '@';

export const webkitLineRegex: RegExp =
  /^\s*at (?:(?![a-z]+:\/\/)([^(]+?) ?\((?:address at )?)?((?:file|https?|blob|chrome-extension|address|native|eval|webpack|<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
export const webkitEvalRegex: RegExp = /\((\S*)(?::(\d+))(?::(\d+))\)/;
export const webkitEvalString = 'eval';
export const webkitAddressAtString = 'address at ';
export const webkitAddressAtStringLength: number = webkitAddressAtString.length;

// The leading lookahead is a fast reject, not a matching rule. The filename group can only
// match something containing "/" (the ":/" and "/path" branches), the literal "[native code]",
// or a path ending in "bundle" or "<digits>.js" — so a line holding none of those substrings
// can never match. Without the lookahead the lazy `(.*?)` still tries every split point first
// and each attempt rescans the rest of the line, which is quadratic in the line length: a
// single 1KB line of hex from a wallet/RPC error message blocked the main thread for ~500ms.
// See https://github.com/grafana/faro-web-sdk/issues/844.
export const firefoxLineRegex: RegExp =
  /^(?=[\s\S]*?(?:\/|bundle|\.js|\[native code]))\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:file|https?|blob|chrome|webpack|resource|moz-extension|safari-extension|safari-web-extension|capacitor)?:\/.*?|\[native code]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
export const firefoxEvalRegex: RegExp = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
export const firefoxEvalString = ' > eval';

export const safariExtensionString = 'safari-extension';
export const safariWebExtensionString = 'safari-web-extension';

export const reactMinifiedRegex: RegExp = /Minified React error #\d+;/i;
