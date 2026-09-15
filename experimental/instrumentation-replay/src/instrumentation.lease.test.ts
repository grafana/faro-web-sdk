import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { ReplayInstrumentation } from './instrumentation';

jest.mock('@grafana/rrweb', () => ({ record: jest.fn(() => jest.fn()) }));

it('does not start rrweb or buffer events while recording ownership is queued', async () => {
  const request = jest.fn(
    (_name: string, { signal }: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      })
  );
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
  const sdk = initializeFaro(mockConfig());
  sdk.api.setSession({ id: 'A', attributes: { isSampled: 'true' } });
  const replay = new ReplayInstrumentation();
  try {
    sdk.instrumentations.add(replay);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(require('@grafana/rrweb').record).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ mode: 'exclusive', signal: expect.any(AbortSignal) }),
      expect.any(Function)
    );
  } finally {
    replay.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
});
