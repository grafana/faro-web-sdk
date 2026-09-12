interface LockRequest {
  name: string;
  callback: LockGrantedCallback<unknown>;
  signal?: AbortSignal;
  abort: () => void;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

// The browser boundary: grants are asynchronous, return values hold the lock,
// and aborting after grant does not release an acquired lock.
beforeEach(() => {
  const queues = new Map<string, LockRequest[]>();
  const held = new Set<string>();
  const drain = (name: string) => {
    if (held.has(name)) {
      return;
    }
    const request = queues.get(name)?.shift();
    if (!request) {
      return;
    }
    request.signal?.removeEventListener('abort', request.abort);
    held.add(name);
    let result: unknown;
    try {
      result = request.callback({ name, mode: 'exclusive' });
    } catch (error) {
      result = Promise.reject(error);
    }
    const release = () => {
      held.delete(name);
      void Promise.resolve().then(() => drain(name));
    };
    void Promise.resolve(result).then(
      (value) => {
        release();
        request.resolve(value);
      },
      (error) => {
        release();
        request.reject(error);
      }
    );
  };
  const manager: LockManager = {
    request: ((
      name: string,
      options: LockOptions | LockGrantedCallback<unknown>,
      callback?: LockGrantedCallback<unknown>
    ) =>
      new Promise<unknown>((resolve, reject) => {
        const signal = typeof options === 'function' ? undefined : options.signal;
        if (signal?.aborted) {
          reject(signal.reason);
          return;
        }
        const request: LockRequest = {
          name,
          callback: typeof options === 'function' ? options : callback!,
          signal,
          resolve,
          reject,
          abort: () => {
            queues.set(
              name,
              queues.get(name)!.filter((queued) => queued !== request)
            );
            reject(signal?.reason);
          },
        };
        const queue = queues.get(name) ?? [];
        queue.push(request);
        queues.set(name, queue);
        signal?.addEventListener('abort', request.abort, { once: true });
        void Promise.resolve().then(() => drain(name));
      })) as LockManager['request'],
    query: async () => ({
      held: [...held].map((name) => ({ name, mode: 'exclusive' as const })),
      pending: [...queues.values()].flat().map(({ name }) => ({ name, mode: 'exclusive' as const })),
    }),
  };
  Object.defineProperty(navigator, 'locks', { configurable: true, value: manager });
});
import { beforeEach } from '@jest/globals';
