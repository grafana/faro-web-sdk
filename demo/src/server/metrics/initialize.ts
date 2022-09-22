import { collectDefaultMetrics } from 'prom-client';

export function initializeMetrics(): void {
  collectDefaultMetrics();
}
