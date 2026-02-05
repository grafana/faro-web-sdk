import { create } from 'node:domain';
import { matchRoutes } from 'react-router';

import {
  initializeFaro as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
import type { Faro } from '@grafana/faro-react';
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
        router: {
          version: createReactRouterV7DataOptions({
            matchRoutes,
          }),
        },
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
  });

  faro.api.pushLog(['Faro was initialized']);

  return faro;
}
