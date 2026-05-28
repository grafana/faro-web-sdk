import type { Faro } from './sdk';
import { EVENT_SDK_INIT } from './semantic';
import { stringifyExternalJson } from './utils';

interface SdkInitIntegration {
  name: string;
  version: string;
  context?: Record<string, unknown>;
}

/**
 * Fires a single beacon during SDK initialization describing the active SDK
 * configuration: the SDK name and version plus the list of active
 * instrumentations and their versions. Instrumentations can optionally
 * contribute additional context via `getInitContext()`.
 *
 * This replaces the previous approach of attaching instrumentation metadata
 * to every beacon (see PR #1972, reverted in PR #2000).
 */
export function pushSdkInitEvent(faro: Faro): void {
  if (faro.config.disableSdkInitEvent) {
    return;
  }

  try {
    const sdkMeta = faro.metas.value.sdk;

    const integrations: SdkInitIntegration[] = faro.instrumentations.instrumentations.map((instrumentation) => {
      const entry: SdkInitIntegration = {
        name: instrumentation.name,
        version: instrumentation.version,
      };

      const context = instrumentation.getInitContext?.();
      if (context && Object.keys(context).length > 0) {
        entry.context = context;
      }

      return entry;
    });

    faro.api.pushEvent(
      EVENT_SDK_INIT,
      {
        sdk_name: sdkMeta?.name ?? '',
        sdk_version: sdkMeta?.version ?? '',
        integrations: stringifyExternalJson(integrations),
      },
      undefined,
      { skipDedupe: true }
    );
  } catch (err) {
    faro.internalLogger.error('Failed to push SDK init event', err);
  }
}
