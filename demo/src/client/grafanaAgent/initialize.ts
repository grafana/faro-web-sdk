import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import {
  initializeGrafanaAgent as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
import type { Agent } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

import { env } from '../utils';

export function initializeGrafanaAgent(): Agent {
  const agent = coreInit({
    url: `http://localhost:${env.agent.portAppReceiver}/collect`,
    apiKey: env.agent.apiKey,
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
    session: (window as any).__PRELOADED_STATE__?.agent?.session,
    app: {
      name: env.client.packageName,
      version: env.package.version,
      environment: env.mode.name,
    },
  });

  agent.api.pushLog(['GrafanaAgent was initialized']);

  return agent;
}
