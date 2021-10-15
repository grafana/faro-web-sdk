import { consoleApiHandler, getFetchApiHandler, initialize, LogLevels, pushLog } from '@grafana/frontend-agent-core';
import browserMetaPlugin from '@grafana/frontend-agent-plugin-browser-meta';
import getConsolePlugin from '@grafana/frontend-agent-plugin-console';
import errorsPlugin from '@grafana/frontend-agent-plugin-errors';
import performancePlugin from '@grafana/frontend-agent-plugin-performance';

initialize({
  apiHandlers: [consoleApiHandler, getFetchApiHandler('http://localhost:8080')],
  plugins: [browserMetaPlugin, getConsolePlugin([LogLevels.DEBUG]), errorsPlugin, performancePlugin],
});

pushLog(['Manual event']);
