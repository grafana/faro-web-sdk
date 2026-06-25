const JSDOMEnvironment = require('jest-environment-jsdom').default;

// jsdom does not expose the Fetch API (or a few other web globals) that
// react-router data routers rely on during navigation. Node provides native
// implementations, so copy them into the jsdom realm.
//
// The Fetch family must be internally consistent: Node's Request validates that
// the `signal` it receives is a Node AbortSignal, so we OVERWRITE jsdom's
// AbortController/AbortSignal with Node's rather than only filling gaps.
const FETCH_FAMILY = ['fetch', 'Request', 'Response', 'Headers', 'AbortController', 'AbortSignal', 'ReadableStream'];
const FILL_IF_MISSING = ['structuredClone', 'TextEncoder', 'TextDecoder'];

class JsdomFetchEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);

    for (const name of FETCH_FAMILY) {
      if (typeof globalThis[name] !== 'undefined') {
        this.global[name] = globalThis[name];
      }
    }

    for (const name of FILL_IF_MISSING) {
      if (this.global[name] === undefined && typeof globalThis[name] !== 'undefined') {
        this.global[name] = globalThis[name];
      }
    }
  }
}

module.exports = JsdomFetchEnvironment;
