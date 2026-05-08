import { matchRoutes } from 'react-router';

import {
  initializeFaro as coreInit,
  createReactRouterV7DataOptions,
  getWebInstrumentations,
  ReactIntegration,
  TransportItemType,
} from '@grafana/faro-react';
import type { Faro, LogEvent, TransportItem } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

import { env } from '../utils/env';

export function initializeFaro(): Faro {
  const faro = coreInit({
    url: `http://localhost:${env.faro.portAppReceiver}/collect`,
    apiKey: env.faro.apiKey,

    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),

      new TracingInstrumentation(),
      new ReactIntegration({
        router: createReactRouterV7DataOptions({
          matchRoutes,
        }),
      }),
    ],
    app: {
      name: env.client.packageName,
      namespace: env.client.packageNamespace,
      version: env.package.version,
      environment: env.mode.name,
    },

    trackResources: true,

    batching: {
      itemLimit: 100,
    },

    // Filter out specific noisy log messages before they are transported.
    // Returning `null` drops the signal; returning the item (optionally
    // modified) sends it.
    beforeSend: (item: TransportItem) => {
      if (item.type === TransportItemType.LOG) {
        const message = String((item.payload as LogEvent).message ?? '');

        if (message === 'Faro was initialized') {
          return null;
        }
      }

      return item;
    },
  });

  // Demonstrates the filter:
  //  - this log is dropped by `beforeSend` above
  faro.api.pushLog(['Faro was initialized']);
  //  - this log passes through and reaches the transport
  faro.api.pushLog(['Faro init complete - filter active']);

  return faro;
}
