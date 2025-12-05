import { onBeforeUpdate, onMounted, onUnmounted, onUpdated } from 'vue';

import { sendComponentPerformanceEvent } from './utils';

export function useFaroProfiler(name: string) {
  const mountStartTime = performance.now();
  let mountEndTime: number | undefined;
  let updateStartTime: number | undefined;

  onMounted(() => {
    mountEndTime = performance.now();
    const duration = mountEndTime - mountStartTime;
    sendComponentPerformanceEvent(name, 'mount', duration);
  });

  onBeforeUpdate(() => {
    updateStartTime = performance.now();
  });

  onUpdated(() => {
    if (updateStartTime !== undefined) {
      const duration = performance.now() - updateStartTime;
      sendComponentPerformanceEvent(name, 'update', duration);
      updateStartTime = undefined;
    }
  });

  onUnmounted(() => {
    if (mountEndTime !== undefined) {
      const duration = performance.now() - mountEndTime;
      sendComponentPerformanceEvent(name, 'lifecycle', duration);
    }
  });
}
