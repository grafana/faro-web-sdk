import type { Agent } from '@grafana/agent-core';

declare global {
  interface Window {
    grafanaAgent: Agent
  }
}
