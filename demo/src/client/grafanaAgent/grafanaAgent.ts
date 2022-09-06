import type { Agent } from '@grafana/agent-integration-react';

export let grafanaAgent: Agent | undefined;

export function setGrafanaAgent(newAgent: Agent): void {
  grafanaAgent = newAgent;
}
