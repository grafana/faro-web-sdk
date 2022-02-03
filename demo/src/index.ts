import { initializeAgent } from '@grafana/javascript-agent-core';
import browserMetaPlugin from '@grafana/javascript-agent-plugin-browser-meta';
import getConsolePlugin from '@grafana/javascript-agent-plugin-console';
import errorsPlugin from '@grafana/javascript-agent-plugin-errors';
import getFetchTransportPlugin from '@grafana/javascript-agent-plugin-fetch-transport';
import pageMetaPlugin from '@grafana/javascript-agent-plugin-page-meta';
import tracingPlugin from '@grafana/javascript-agent-plugin-tracing';
import webVitalsPlugin from '@grafana/javascript-agent-plugin-web-vitals';

const agent = initializeAgent({
  plugins: [
    browserMetaPlugin,
    getConsolePlugin({
      enableTransport: true,
    }),
    getFetchTransportPlugin({
      url: 'http://localhost:8080/collect',
      debug: true,
      requestOptions: {
        headers: { 'x-api-key': 'my-api-key' },
      },
    }),
    errorsPlugin,
    pageMetaPlugin,
    tracingPlugin,
    webVitalsPlugin,
  ],
});

agent.api.pushLog(['Manual event from initialized agent']);
