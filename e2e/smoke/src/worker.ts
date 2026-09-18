import { type Faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

let faro: Faro | undefined;
let connections = 0;

function connect(port: MessagePort) {
  connections++;
  port.onmessage = async ({ data }) => {
    if (!faro) {
      faro = initializeFaro({
        app: { name: 'worker-smoke' },
        url: data.collector,
        isolate: true,
        batching: { enabled: true, sendTimeout: 20 },
        instrumentations: [
          ...getWebInstrumentations(),
          new TracingInstrumentation({
            instrumentationOptions: { propagateTraceHeaderCorsUrls: [/.*/] },
          }),
        ],
      });
    }

    if (data.emit) {
      faro.api.pushEvent('worker-event');
      faro.api.pushMeasurement({ type: 'worker-measurement', values: { messages: 1 } });
      console.info('worker-console');
      await fetch('/index.html?worker-relative-request');
      await fetch(new Request(data.collector.replace('/collect', '/fetch')));
      if (typeof XMLHttpRequest !== 'undefined') {
        await new Promise<void>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.onloadend = () => resolve();
          xhr.open('GET', data.collector.replace('/collect', '/xhr'));
          xhr.send();
        });
      }
      // Native events exercise the worker's actual error/rejection dispatch semantics.
      setTimeout(() => {
        throw new Error('worker-uncaught');
      }, 0);
      void Promise.reject(new Error('worker-rejection'));
    }

    port.postMessage({
      id: faro.api.getSession()?.id,
      connections,
      hasWindow: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      page: faro.metas.value.page,
    });
  };
  port.start();
}

self.addEventListener('connect', ((event: MessageEvent) => connect(event.ports[0]!)) as EventListener);
// Dedicated workers receive their control port explicitly.
self.addEventListener('message', ((event: MessageEvent) => connect(event.ports[0]!)) as EventListener);
