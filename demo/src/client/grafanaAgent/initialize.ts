import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import {
  initializeGrafanaAgent as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/agent-integration-react';
import type { Agent } from '@grafana/agent-integration-react';
import { TracingInstrumentation } from '@grafana/agent-tracing-web';

import { env } from '../utils';

export function initializeGrafanaAgent(): Agent {
  const agent = coreInit({
    url: `http://localhost:${env.agentPortAppReceiver}/collect`,
    apiKey: env.agentApiKey,
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
    session: {
      id: uuidv4(),
    },
    app: {
      name: env.clientPackageName,
      version: env.packageVersion,
      environment: env.mode.name,
    },
  });

  // agent.api.pushLog(['GrafanaAgent was initialized']);

  return agent;
}
