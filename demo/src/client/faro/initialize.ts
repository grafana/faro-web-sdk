import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

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
    url: 'https://faro-collector-prod-us-central-0.grafana.net/collect/66d2a3caa8a930dbcace054b646d00bb',
    app: {
      name: 'User Actions',
      version: '1.0.0',
      environment: 'production',
    },

    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),

      new TracingInstrumentation(),
      new ReactIntegration({
        router: {
          version: ReactRouterVersion.V6,
          dependencies: {
            createRoutesFromChildren,
            matchRoutes,
            Routes,
            useLocation,
            useNavigationType,
          },
        },
      }),
    ],
    // app: {
    //   name: env.client.packageName,
    //   namespace: env.client.packageNamespace,
    //   version: env.package.version,
    //   environment: env.mode.name,
    // },

    trackResources: true,

    batching: {
      itemLimit: 100,
    },

    trackUserActionsPreview: true,
  });

  faro.api.pushLog(['Faro was initialized']);

  return faro;
}
