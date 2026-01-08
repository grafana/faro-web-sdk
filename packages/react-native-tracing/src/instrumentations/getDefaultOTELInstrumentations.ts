import type { Span } from '@opentelemetry/api';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

import { faro, type UserActionInternalInterface, UserActionState } from '@grafana/faro-core';

import type { DefaultInstrumentationsOptions, InstrumentationOption } from '../types';

import { fetchCustomAttributeFunctionWithDefaults } from './instrumentationUtils';

/**
 * Get default OTEL instrumentations for React Native
 *
 * This function creates the default OpenTelemetry instrumentations for React Native:
 * - FetchInstrumentation: Traces fetch() API calls
 *
 * IMPORTANT: Infinite loop prevention
 * - ignoreUrls is used to exclude Faro collector URLs
 * - ignoreNetworkEvents is true to avoid duplicate events
 * - No console logging during instrumentation
 *
 * @param options - Configuration options
 * @returns Array of OTEL instrumentations
 */
export function getDefaultOTELInstrumentations(options: DefaultInstrumentationsOptions = {}): InstrumentationOption[] {
  const { fetchInstrumentationOptions, ...sharedOptions } = options;

  const fetchOpts = createFetchInstrumentationOptions(fetchInstrumentationOptions, sharedOptions);

  return [new FetchInstrumentation(fetchOpts)];
}

function createFetchInstrumentationOptions(
  fetchInstrumentationOptions: DefaultInstrumentationsOptions['fetchInstrumentationOptions'],
  sharedOptions: Record<string, unknown>
) {
  return {
    ...sharedOptions,
    // Ignore network performance events to avoid duplicates
    ignoreNetworkEvents: true,
    // Keep this here to overwrite the defaults above if provided by the users
    ...fetchInstrumentationOptions,
    // Always keep this function
    applyCustomAttributesOnSpan: fetchCustomAttributeFunctionWithDefaults(
      fetchInstrumentationOptions?.applyCustomAttributesOnSpan
    ),
    // Request hook to add user action context
    requestHook: (span: Span) => {
      try {
        const currentAction = faro.api.getActiveUserAction();
        if (
          currentAction &&
          (currentAction as unknown as UserActionInternalInterface)?.getState() === UserActionState.Started
        ) {
          span.setAttribute('faro.action.user.name', currentAction.name);
          span.setAttribute('faro.action.user.parentId', currentAction.parentId);
        }
      } catch {
        // Silently fail - don't log to avoid infinite loops
        // The span will just not have user action context
      }
    },
  };
}
