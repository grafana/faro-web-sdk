import type { Agent } from '@grafana/faro-core';

declare global {
  interface Window {
    grafanaAgent: Agent;
  }
}
