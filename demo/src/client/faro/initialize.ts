import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import {
  initializeFaro as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
import type { Faro } from '@grafana/faro-react';
// import { BatchTransport } from '@grafana/faro-transport-batch';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

import { env } from '../utils';

export function initializeFaro(): Faro {
  const faro = coreInit({
    // url: `http://localhost:${env.faro.portAppReceiver}/collect`,
    // apiKey: env.faro.apiKey,
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
    session: (window as any).__PRELOADED_STATE__?.faro?.session,
    app: {
      name: env.client.packageName,
      version: env.package.version,
      environment: env.mode.name,
    },
    // transports: [
    //   new BatchTransport(
    //     new OtlpHttpTransport({
    //       tracesURL: `http://localhost:${env.faro.portAppReceiver}/collect`,
    //       logsURL: `http://localhost:${env.faro.portAppReceiver}/collect`,
    //       apiKey: env.faro.apiKey,
    //     }),
    //     {
    //       batchSendCount: 50,
    //       batchSendTimeout: 500,
    //     }
    //   ),
    // ],
  });

  faro.api.pushLog(['Faro was initialized']);

  return faro;
}
