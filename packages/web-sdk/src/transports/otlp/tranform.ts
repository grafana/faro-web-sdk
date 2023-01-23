import { SemanticResourceAttributes, SemanticAttributes } from '@opentelemetry/semantic-conventions';

export function toOtlpLog(): unknown {
  throw new Error('Function is not implemented yet');
}

// export function toOtlpMetricsSchema() {}
// export function toOtlpTracesSchema() {}

/**
 * Seems currently to be missing in the semantic-conventions package.
 * See: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#todos
 *
 * Took the few attributes as defined in the docs
 */
export const SemanticBrowserAtributes = Object.freeze({
  brands: 'browser.brands', // TODO: Q: shall we add this to meta.ts => navigator.userAgentData.brands. !The spec is still experimental!
  platform: 'browser.platform',
  mobile: 'browser.mobile',
  userAgent: 'browser.user_agent', // TODO: Q: shall we add this to meta.ts => parser.getUA()
  language: 'browser.language', // TODO: Q: shall we add this to meta.ts => window.navigator.language
});
