import { consoleTransport, getFetchTransport, initializeAgent, LogLevel } from '@grafana/javascript-agent-core';
import browserMetaPlugin from '@grafana/javascript-agent-plugin-browser-meta';
import getConsolePlugin from '@grafana/javascript-agent-plugin-console';
import errorsPlugin from '@grafana/javascript-agent-plugin-errors';
import pageMetaPlugin from '@grafana/javascript-agent-plugin-page-meta';
import performancePlugin from '@grafana/javascript-agent-plugin-performance';
import tracingPlugin from '@grafana/javascript-agent-plugin-tracing';

const agent = initializeAgent({
  plugins: [
    browserMetaPlugin,
    getConsolePlugin([LogLevel.DEBUG]),
    errorsPlugin,
    pageMetaPlugin,
    performancePlugin,
    tracingPlugin,
  ],
  transports: [
    consoleTransport,
    getFetchTransport({ url: 'http://localhost:8080/collect', debug: true, headers: { 'x-api-key': 'my-api-key' } }),
  ],
});

agent.api.pushLog(['Manual event from initialized agent']);
