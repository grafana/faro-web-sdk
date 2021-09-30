import { initializeGrafanaFEAgent } from '@grafana/frontend-agent-core';
import { grafanaFEAgentPluginConsole } from '@grafana/frontend-agent-plugin-console';
import { grafanaFEAgentPluginErrors } from '@grafana/frontend-agent-plugin-errors';

initializeGrafanaFEAgent({
  plugins: [grafanaFEAgentPluginConsole, grafanaFEAgentPluginErrors],
});
