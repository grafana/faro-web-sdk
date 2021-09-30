import { initialize, logger } from '@grafana/frontend-agent-core';
import consolePlugin from '@grafana/frontend-agent-plugin-console';
import errorsPlugin from '@grafana/frontend-agent-plugin-errors';

initialize({
  plugins: [consolePlugin, errorsPlugin],
  receiverUrl: 'http://localhost:8080/',
});

logger.sendEvent('Manual event');
