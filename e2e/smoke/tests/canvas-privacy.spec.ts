import type { ReplayInstrumentation } from '@grafana/faro-instrumentation-replay';
import type * as WebSdk from '@grafana/faro-web-sdk';

import { expect, test } from './fixtures';

test('records the DOM and samples only the public canvas without embedding pixels in the checkpoint', async ({
  page,
}) => {
  await page.route('**/canvas-privacy', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<button id="map-reset">Reset map</button>
        <canvas id="public"></canvas>
        <canvas id="blocked" class="grafana-block"></canvas>
        <div class="private"><canvas id="private-child"></canvas></div>`,
    })
  );
  await page.goto('/canvas-privacy');
  await page.addScriptTag({ url: '/bundles/faro-web-sdk.iife.js' });
  await page.addScriptTag({ url: '/bundles/faro-instrumentation-replay.iife.js' });

  const result = await page.evaluate(async () => {
    const { GrafanaFaroWebSdk, GrafanaFaroInstrumentationReplay } = window as unknown as {
      GrafanaFaroWebSdk: typeof WebSdk;
      GrafanaFaroInstrumentationReplay: { ReplayInstrumentation: typeof ReplayInstrumentation };
    };
    const canvases = document.querySelectorAll('canvas');
    const paint = (width: number) => canvases.forEach((canvas) => canvas.getContext('2d')!.fillRect(0, 0, width, 10));
    paint(10);
    const pixelReads: string[] = [];
    for (const canvas of canvases) {
      const context = canvas.getContext('2d')!;
      const getImageData = context.getImageData.bind(context);
      context.getImageData = (...args) => {
        pixelReads.push(canvas.id);
        return getImageData(...args);
      };
      const toBlob = canvas.toBlob.bind(canvas);
      canvas.toBlob = (...args) => {
        pixelReads.push(canvas.id);
        toBlob(...args);
      };
      const toDataURL = canvas.toDataURL.bind(canvas);
      canvas.toDataURL = (...args) => {
        pixelReads.push(canvas.id);
        return toDataURL(...args);
      };
    }

    let publicId: number | undefined;
    let foundResetButton = false;
    const initialPixels: number[] = [];
    const frameIds: number[] = [];
    const completed = new Promise<void>((resolve) => {
      GrafanaFaroWebSdk.initializeFaro({
        app: { name: 'canvas-privacy' },
        url: '/collect',
        sessionTracking: { enabled: true, samplingRate: 1 },
        instrumentations: [
          ...GrafanaFaroWebSdk.getWebInstrumentations(),
          new GrafanaFaroInstrumentationReplay.ReplayInstrumentation({
            captureCanvasSnapshots: true,
            blockSelector: '.private',
            beforeSend(event) {
              if (event.type === 2) {
                const visit = (node: typeof event.data.node) => {
                  if ('tagName' in node && node.tagName === 'button' && node.attributes['id'] === 'map-reset') {
                    foundResetButton = true;
                  }
                  if ('tagName' in node && node.tagName === 'canvas') {
                    if (node.attributes['id'] === 'public') {
                      publicId = node.id;
                    }
                    if (node.attributes['rr_dataURL']) {
                      initialPixels.push(node.id);
                    }
                  }
                  if ('childNodes' in node) {
                    node.childNodes.forEach(visit);
                  }
                };
                visit(event.data.node);
              }
              if (event.type === 3 && event.data.source === 9) {
                frameIds.push(event.data.id);
                if (frameIds.length === 2) {
                  resolve();
                }
                paint(20);
              }
              return event;
            },
          }),
        ],
      });
    });
    await completed;
    return { publicId, foundResetButton, initialPixels, frameIds, pixelReads: Array.from(new Set(pixelReads)) };
  });

  expect(result.publicId).toBeDefined();
  expect(result.foundResetButton).toBe(true);
  expect(result.initialPixels).toEqual([]);
  expect(result.frameIds).toEqual([result.publicId, result.publicId]);
  expect(result.pixelReads).toEqual(['public']);
});
