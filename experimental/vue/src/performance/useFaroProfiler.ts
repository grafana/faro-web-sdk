import { onBeforeUpdate, onMounted, onUnmounted, onUpdated } from 'vue';

import { api } from '../dependencies';

const COMPONENT_EVENT_NAME = 'faro.vue.performance.component';

export function useFaroProfiler(name: string) {
  const mountStartTime = performance.now();
  let mountEndTime: number | undefined;
  let updateStartTime: number | undefined;

  onMounted(() => {
    mountEndTime = performance.now();
    const duration = mountEndTime - mountStartTime;

    api?.pushEvent(COMPONENT_EVENT_NAME, {
      name,
      phase: 'mount',
      duration: duration.toString(),
    });
  });

  onBeforeUpdate(() => {
    updateStartTime = performance.now();
  });

  onUpdated(() => {
    if (updateStartTime !== undefined) {
      const duration = performance.now() - updateStartTime;

      api?.pushEvent(COMPONENT_EVENT_NAME, {
        name,
        phase: 'update',
        duration: duration.toString(),
      });

      updateStartTime = undefined;
    }
  });

  onUnmounted(() => {
    if (mountEndTime !== undefined) {
      const duration = performance.now() - mountEndTime;

      api?.pushEvent(COMPONENT_EVENT_NAME, {
        name,
        phase: 'lifecycle',
        duration: duration.toString(),
      });
    }
  });
}
