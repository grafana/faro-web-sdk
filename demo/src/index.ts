import { consoleTransport, getFetchTransport, initializeAgent, LogLevel } from '@grafana/frontend-agent-core';
import browserMetaPlugin from '@grafana/frontend-agent-plugin-browser-meta';
import getConsolePlugin from '@grafana/frontend-agent-plugin-console';
import errorsPlugin from '@grafana/frontend-agent-plugin-errors';
import pageMetaPlugin from '@grafana/frontend-agent-plugin-page-meta';
import performancePlugin from '@grafana/frontend-agent-plugin-performance';
import tracingPlugin from '@grafana/frontend-agent-plugin-tracing';

const agent = initializeAgent({
  plugins: [
    browserMetaPlugin,
    getConsolePlugin([LogLevel.DEBUG]),
    errorsPlugin,
    pageMetaPlugin,
    performancePlugin,
    tracingPlugin,
  ],
  transports: [consoleTransport, getFetchTransport('http://localhost:8080/collect')],
});

agent.commander.pushLog(['Manual event from initialized agent']);
