import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import {
  initializeFaro as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
import type { Faro } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export function initializeFaro(): Faro {
  const faro = coreInit({
    // url: `http://localhost:${env.faro.portAppReceiver}/collect`,
    // apiKey: env.faro.apiKey,

    url: 'https://faro-collector-dev-us-east-0.grafana-dev.net/collect/3f63ce47fa742f9c6c60ef6a905e116f',
    app: {
      name: 'User Actions',
      version: '1.0.0',
      environment: 'production',
    },

    // url: 'https://faro-collector-ops-eu-south-0.grafana-ops.net/collect/2f2593cc17441b0c0933e1cb185348e9',
    // app: {
    //   name: 'Test user actions feature',
    //   version: '1.0.0',
    //   environment: 'production',
    // },

    // url: 'https://faro-collector-dev-us-east-0.grafana-dev.net/collect/7b0ecefe272b66f999b0d815e59a9cbe',
    // app: {
    //   name: 'User Actions',
    //   version: '1.0.0',
    //   environment: 'production',
    // },

    trackWebVitalsAttribution: true,
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
