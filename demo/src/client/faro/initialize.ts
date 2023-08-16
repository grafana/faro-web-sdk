import { type } from 'os';
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import { PerformanceTimelineInstrumentation } from '@grafana/faro-instrumentation-performance-timeline';
import {
  initializeFaro as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
import type { Faro } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

import { env } from '../utils';

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
      new PerformanceTimelineInstrumentation({
        beforeEmit(performanceEntryJSON) {
          if (performanceEntryJSON.entryType === 'resource') {
            const entry = performanceEntryJSON as Partial<PerformanceResourceTiming>;
            // const { entryType, duration, fetchStart, ...strippedEntry } = entry;

            // Object.values(strippedEntry).map(p => {
            //   p
            // });

            // console.log('entry before :>> ', { ...entry });
            // //@ts-expect-error
            // delete entry.entryType;
            // //@ts-expect-error
            // delete entry.entryType;
            // console.log('entry after :>> ', { ...entry });

            return {};
          }

          return performanceEntryJSON;
        },
      }),
    ],
    session: (window as any).__PRELOADED_STATE__?.faro?.session,
    batching: {
      enabled: false,
    },
    app: {
      name: env.client.packageName,
      version: env.package.version,
      environment: env.mode.name,
    },
  });

  faro.api.pushLog(['Faro was initialized']);

  return faro;
}
