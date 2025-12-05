import { api } from '../dependencies';

const COMPONENT_EVENT_NAME = 'faro.vue.performance.component';

export function sendComponentPerformanceEvent(
  name: string,
  phase: 'mount' | 'update' | 'lifecycle',
  duration: number
): void {
  api?.pushEvent(COMPONENT_EVENT_NAME, {
    name,
    phase,
    duration: duration.toString(),
  });
}
