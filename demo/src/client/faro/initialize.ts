import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import { PerformanceTimelineInstrumentation } from '@grafana/faro-instrumentation-performance-timeline';
import type { Faro } from '@grafana/faro-react';
import {
  initializeFaro as coreInit,
  getWebInstrumentations,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';
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

      // "connectEnd": "88",
      // "connectStart": "88",
      // "decodedBodySize": "857",
      // "domainLookupEnd": "88",
      // "domainLookupStart": "88",
      // "duration": "287",
      // "encodedBodySize": "857",
      // "entryType": "resource",
      // "fetchStart": "88",
      // "initiatorType": "other",
      // "name": "http://localhost:5173/favicon.png",
      // "nextHopProtocol": "http/1.1",
      // "redirectEnd": "0",
      // "redirectStart": "0",
      // "requestStart": "373",
      // "responseEnd": "375",
      // "responseStart": "375",
      // "secureConnectionStart": "0",
      // "serverTiming": "[]",
      // "startTime": "88",
      // "transferSize": "1161",
      // "workerStart": "0"

      new PerformanceTimelineInstrumentation({
        beforeEmit(performanceEntryJSON) {
          if (performanceEntryJSON.entryType === 'resource') {
            const entry = performanceEntryJSON as PerformanceResourceTiming;


            // "connectEnd": "88",
            // "connectStart": "88",
            // "decodedBodySize": "857",
            // "domainLookupEnd": "88",
            // "domainLookupStart": "88",
            // "duration": "287",
            // "encodedBodySize": "857",
            // "entryType": "resource",
            // "fetchStart": "88",
            // "initiatorType": "other",
            // "name": "http://localhost:5173/favicon.png",
            // "nextHopProtocol": "http/1.1",
            // "redirectEnd": "0",
            // "redirectStart": "0",
            // "requestStart": "373",
            // "responseEnd": "375",
            // "responseStart": "375",
            // "secureConnectionStart": "0",
            // "serverTiming": "[]",
            // "startTime": "88",
            // "transferSize": "1161",
            // "workerStart": "0"

            // Steps:
            // removed: duration: '287',
            // removed: fetchStart: '88',

            // build new object, put entry type so we can identify all different resource types in the


            const newEntry = {
              entryType: 'resource',
              'http://localhost:5173/favicon.png': [  //name:
                connectEnd
                connectStart
                decodedBodySize
                domainLookupEnd
                domainLookupStart
                encodedBodySize
                initiatorType
                nextHopProtocol
                redirectEnd
                redirectStart
                requestStart
                responseEnd
                responseStart
                secureConnectionStart
                serverTiming
                startTime
                transferSize
                workerStart
              ]
            };

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
      itemLimit: 30,
      sendTimeout:

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