import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';

import type { TransportBody } from '@grafana/faro-core';

// A real collector is needed: page.route does not observe SharedWorker requests.
for (const kind of ['shared', 'dedicated'] as const) {
  test(`${kind} worker reports native errors, logs, measurements, and HTTP traces`, async ({ page, context }) => {
    const bodies: TransportBody[] = [];
    const tracedRequests: string[] = [];
    const server = createServer((request, response) => {
      response.setHeader('access-control-allow-origin', '*');
      response.setHeader('access-control-allow-headers', request.headers['access-control-request-headers'] ?? '*');
      if (request.method === 'OPTIONS') {
        response.writeHead(204).end();
        return;
      }
      if (request.headers.traceparent) {
        tracedRequests.push(request.url!);
      }
      const chunks: Buffer[] = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        if (request.url === '/collect') {
          bodies.push(JSON.parse(Buffer.concat(chunks).toString()));
        }
        response.writeHead(200, { 'content-type': 'application/json' }).end('{}');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Collector did not bind a TCP port');
    }
    const collector = `http://127.0.0.1:${address.port}/collect`;

    try {
      // An empty document avoids initializing a second Faro instance on the page.
      await context.route('**/worker-host', (route) =>
        route.fulfill({ contentType: 'text/html', body: '<html></html>' })
      );
      await page.goto('/worker-host');
      const first = await page.evaluate(
        async ({ kind, collector }) => {
          const worker =
            kind === 'shared'
              ? new SharedWorker('/src/worker.ts', { type: 'module', name: collector })
              : new Worker('/src/worker.ts', { type: 'module' });
          const channel = new MessageChannel();
          const port = worker instanceof SharedWorker ? worker.port : channel.port1;
          if (worker instanceof Worker) {
            worker.postMessage({}, [channel.port2]);
          }
          // Keep the worker and its port alive for the multi-tab check.
          Object.assign(window, { worker, workerPort: port });
          port.start();
          return new Promise<{
            id: string;
            connections: number;
            hasWindow: boolean;
            hasDocument: boolean;
            page?: unknown;
          }>((resolve, reject) => {
            worker.onerror = (event) => reject(new Error(event.message));
            port.onmessage = ({ data }) => resolve(data);
            port.postMessage({ collector, emit: true });
          });
        },
        { kind, collector }
      );
      expect(first).toMatchObject({ connections: 1, hasWindow: false, hasDocument: false });
      expect(first.id).toBeTruthy();
      expect(first.page).toBeUndefined();

      await expect
        .poll(() => bodies.flatMap((body) => body.exceptions ?? []).map(({ value }) => value))
        .toEqual(expect.arrayContaining(['worker-uncaught', 'worker-rejection']));
      expect(bodies.flatMap((body) => body.logs ?? []).map(({ message }) => message)).toContain('worker-console');
      expect(bodies.flatMap((body) => body.events ?? []).map(({ name }) => name)).toContain('worker-event');
      expect(bodies.flatMap((body) => body.measurements ?? []).map(({ type }) => type)).toContain('worker-measurement');

      await expect
        .poll(
          () =>
            bodies
              .flatMap((body) => body.traces?.resourceSpans ?? [])
              .flatMap((resource) => resource.scopeSpans ?? [])
              .flatMap((scope) => scope.spans ?? []).length
        )
        .toBe(3);
      expect(tracedRequests).toEqual(expect.arrayContaining(['/fetch', '/xhr']));
      expect(tracedRequests).not.toContain('/collect');
      expect(bodies.every((body) => body.meta.session?.id === first.id)).toBe(true);

      if (kind === 'shared') {
        const other = await context.newPage();
        await other.goto('/worker-host');
        const second = await other.evaluate(async (collector) => {
          const worker = new SharedWorker('/src/worker.ts', { type: 'module', name: collector });
          Object.assign(window, { worker });
          worker.port.start();
          return new Promise<{ id: string; connections: number }>((resolve) => {
            worker.port.onmessage = ({ data }) => resolve(data);
            worker.port.postMessage({ collector });
          });
        }, collector);
        expect(second).toEqual(expect.objectContaining({ id: first.id, connections: 2 }));
        await page.close();
        const remainingId = await other.evaluate(
          () =>
            new Promise<string>((resolve) => {
              const { worker } = window as unknown as { worker: SharedWorker };
              worker.port.onmessage = ({ data }) => resolve(data.id);
              worker.port.postMessage({});
            })
        );
        expect(remainingId).toBe(first.id);
        await other.close();
      }
    } finally {
      await test.info().attach('worker-telemetry', {
        body: JSON.stringify({ bodies, tracedRequests }, null, 2),
        contentType: 'application/json',
      });
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}
