import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import {
  initializeFaro as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
import type { Faro } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

// import { env } from '../utils';

export function initializeFaro(): Faro {
  const faro = coreInit({
    // url: `http://localhost:${env.faro.portAppReceiver}/collect`,
    // apiKey: env.faro.apiKey,

    // url: 'https://faro-collector-dev-us-east-0.grafana-dev.net/collect/3f63ce47fa742f9c6c60ef6a905e116f',
    // app: {
    //   name: 'User Actions',
    //   version: '1.0.0',
    //   environment: 'production',
    // },

    // TEST
    // url: 'https://faro-collector-dev-us-east-0.grafana-dev.net/collect/4b790565883d7761bb443308a559de6f',
    // app: {
    //   name: 'Test',
    //   version: '1.0.0',
    //   environment: 'production',
    // },

    // TEST 2
    // url: 'https://faro-collector-dev-us-east-0.grafana-dev.net/collect/790b3b88b908f86a6cfbcc3419bc871e',
    // app: {
    //   name: 'Test 2',
    //   version: '1.0.0',
    //   environment: 'production',
    // },

    // Test 4
    // url: 'https://faro-collector-dev-us-east-0.grafana-dev.net/collect/b2d0431645a54a242ab8cbe659884c63',
    // app: {
    //   name: 'Test 4',
    //   version: '1.0.0',
    //   environment: 'production',
    // },

    // ops
    // url: 'https://faro-collector-ops-eu-south-0.grafana-ops.net/collect/2f2593cc17441b0c0933e1cb185348e9',
    // app: {
    //   name: 'Test user actions feature',
    //   version: '1.0.0',
    //   environment: 'production',
    // },

    // new stack test 0
    url: 'https://faro-collector-dev-us-central-0.grafana-dev.net/collect/56c0935b60c727c2dfbf092b40b3c891',
    app: {
      name: 'Test 0',
      version: '1.0.0',
      environment: 'production',
    },

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

    trackUserActions: true,
    trackUserActionsDataAttributeName: 'data-faro-user-action-name-custom',
  });

  faro.api.pushLog(['Faro was initialized']);

  return faro;
}
