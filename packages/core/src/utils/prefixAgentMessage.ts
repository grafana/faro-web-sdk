export function prefixAgentMessage(message: string): string {
  return `[Grafana JavaScript Agent] ${message}`;
}
