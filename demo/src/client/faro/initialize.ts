import {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import {
  initializeFaro as coreInit,
  createReactRouterV6Options,
  getWebInstrumentations,
  ReactIntegration,
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
        router: createReactRouterV6Options({
          createRoutesFromChildren,
          matchRoutes,
          Routes,
          useLocation,
          useNavigationType,
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
  });

  faro.api.pushLog(['Faro was initialized']);

  return faro;
}
