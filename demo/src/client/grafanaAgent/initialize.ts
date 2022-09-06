import {
  initializeGrafanaAgent as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/agent-integration-react';
import type { Agent } from '@grafana/agent-integration-react';
import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../../utils';
import { setGrafanaAgent } from './grafanaAgent';

export function initializeGrafanaAgent(): Agent {
  const agent = coreInit({
    url: 'http://localhost:8027/collect',
    apiKey: 'api_key',
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
      name: '@grafana/agent-demo',
      version: '0.0.1',
      environment: env.prod ? 'production' : env.test ? 'test' : 'development',
    },
  });

  setGrafanaAgent(agent);

  return agent;
}
