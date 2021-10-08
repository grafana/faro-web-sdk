import { initialize, logger, LoggerLogLevels } from '@grafana/frontend-agent-core';
import browserMetaPlugin from '@grafana/frontend-agent-plugin-browser-meta';
import getConsolePlugin from '@grafana/frontend-agent-plugin-console';
import errorsPlugin from '@grafana/frontend-agent-plugin-errors';
import performancePlugin from '@grafana/frontend-agent-plugin-performance';

initialize({
  plugins: [browserMetaPlugin, getConsolePlugin([LoggerLogLevels.DEBUG]), errorsPlugin, performancePlugin],
  receiverUrl: 'http://localhost:8080/',
});

logger.log(['Manual event']);
