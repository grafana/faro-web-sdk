/**
 * Whether the current environment provides the DOM APIs the web instrumentations
 * and the browser related metas depend on.
 *
 * `window` and `document` are checked with `typeof` because a bare reference throws a
 * `ReferenceError` in environments where they are not declared at all, for example SSR,
 * workers or test setups without a DOM.
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
