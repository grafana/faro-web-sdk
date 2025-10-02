import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import {
  initializeFaro as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
import type { Faro } from '@grafana/faro-react';
import { FARO_JOURNEY_KEY } from '@grafana/faro-web-sdk';
import * as webStorageUtil from '@grafana/faro-web-sdk/src/utils';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export function initializeFaro(): Faro {
  const currentUserJourney = webStorageUtil.getItem(FARO_JOURNEY_KEY, 'localStorage');
  console.log('currentUserJourney :>> ', currentUserJourney);

  const faro = coreInit({
    // url: `http://localhost:${env.faro.portAppReceiver}/collect`,
    // apiKey: env.faro.apiKey,

    url: 'https://faro-collector-prod-us-central-0.grafana.net/collect/f897a26a72dc1f6618c98e970b985154',
    app: {
      name: 'hackathon-pathfinders-test',
      version: '1.0.0',
      environment: 'production',
    },

    user: {
      username: 'marco',
      ...(currentUserJourney ? { attributes: { journey: currentUserJourney } } : {}),
    },

    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: false,
        enableUserEventsInstrumentation: true,
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
