import type { Span } from '@opentelemetry/api';
import { FetchInstrumentation, type FetchRequestHookFunction } from '@opentelemetry/instrumentation-fetch';

import { faro, type UserActionInternalInterface, UserActionState } from '@grafana/faro-web-sdk';

import { FaroXhrInstrumentation } from './faroXhrInstrumentation';
import {
  fetchCustomAttributeFunctionWithDefaults,
  xhrCustomAttributeFunctionWithDefaults,
} from './instrumentationUtils';
import type { DefaultInstrumentationsOptions, InstrumentationOption } from './types';

type InternalDefaultInstrumentationsOptions = DefaultInstrumentationsOptions & {
  shouldRunFaroDefaults?: (span: Span) => boolean;
};

export function getDefaultOTELInstrumentations(
  options: InternalDefaultInstrumentationsOptions = {}
): InstrumentationOption[] {
  const { fetchInstrumentationOptions, xhrInstrumentationOptions, shouldRunFaroDefaults, ...sharedOptions } = options;

  const fetchOpts = createFetchInstrumentationOptions(
    fetchInstrumentationOptions,
    sharedOptions,
    shouldRunFaroDefaults
  );
  const xhrOpts = createXhrInstrumentationOptions(xhrInstrumentationOptions, sharedOptions, shouldRunFaroDefaults);

  return [new FetchInstrumentation(fetchOpts), new FaroXhrInstrumentation(xhrOpts)];
}
function createFetchInstrumentationOptions(
  fetchInstrumentationOptions: DefaultInstrumentationsOptions['fetchInstrumentationOptions'],
  sharedOptions: Record<string, unknown>,
  shouldRunFaroDefaults?: (span: Span) => boolean
) {
  return {
    ...sharedOptions,
    ignoreNetworkEvents: true,
    // keep this here to overwrite the defaults above if provided by the users
    ...fetchInstrumentationOptions,
    // always keep these functions, they compose the caller's callback with Faro's own
    applyCustomAttributesOnSpan: fetchCustomAttributeFunctionWithDefaults(
      fetchInstrumentationOptions?.applyCustomAttributesOnSpan,
      shouldRunFaroDefaults
    ),
    requestHook: fetchRequestHookWithDefaults(fetchInstrumentationOptions?.requestHook, shouldRunFaroDefaults),
  };
}

/**
 * Adds the active user action to every span, then runs the caller's own hook.
 */
function fetchRequestHookWithDefaults(
  callback?: FetchRequestHookFunction,
  shouldRunFaroDefaults?: (span: Span) => boolean
) {
  return (span: Span, request: Request | RequestInit) => {
    const currentAction = shouldRunFaroDefaults?.(span) === false ? undefined : faro.api.getActiveUserAction();
    if (
      currentAction &&
      (currentAction as unknown as UserActionInternalInterface)?.getState() === UserActionState.Started
    ) {
      span.setAttribute('faro.action.user.name', currentAction.name);
      span.setAttribute('faro.action.user.parentId', currentAction.parentId);
    }

    callback?.(span, request);
  };
}

function createXhrInstrumentationOptions(
  xhrInstrumentationOptions: DefaultInstrumentationsOptions['xhrInstrumentationOptions'],
  sharedOptions: Record<string, unknown>,
  shouldRunFaroDefaults?: (span: Span) => boolean
) {
  return {
    ...sharedOptions,
    ignoreNetworkEvents: true,
    // keep this here to overwrite the defaults above if provided by the users
    ...xhrInstrumentationOptions,
    // always keep this function
    applyCustomAttributesOnSpan: xhrCustomAttributeFunctionWithDefaults(
      xhrInstrumentationOptions?.applyCustomAttributesOnSpan,
      shouldRunFaroDefaults
    ),
  };
}
