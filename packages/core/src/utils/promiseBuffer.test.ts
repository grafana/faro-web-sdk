import { createTestPromise, TestPromise } from '../testUtils';

import { createPromiseBuffer } from './promiseBuffer';

async function defer(fn: () => void) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      fn();
      resolve();
    }, 0);
  });
}

describe('PromiseBuffer', () => {
  it('add() new promise that resolves when task is completed', async () => {
    const buf = createPromiseBuffer({ size: 2, concurrency: 2 });
    expect(await buf.add(() => Promise.resolve('hi'))).toEqual('hi');
  });

  it('executes tasks concurrently, limited to concurrency setting', async () => {
    const promises: Array<TestPromise<void>> = [];
    const buf = createPromiseBuffer({
      size: 10,
      concurrency: 2,
    });

    const addTask = (id: number) => {
      return buf.add(() => {
        const prom = createTestPromise<void>(id);
        promises.push(prom);
        return prom.promise;
      });
    };

    addTask(1);
    addTask(2);
    addTask(3);

    // 1 & 2 have started to execute. 3d is not started
    expect(promises).toHaveLength(2);
    expect(promises[0]?.id).toEqual(1);
    expect(promises[1]?.id).toEqual(2);

    // resolve first two
    promises[0]?.resolve();
    promises[1]?.resolve();

    await defer(() => {
      // 3 has started to be executed
      expect(promises).toHaveLength(3);
      expect(promises[2]?.id).toEqual(3);
      promises[2]?.resolve();
    });
  });

  it('rejects tasks that exceed buffer size', async () => {
    const promises: Array<TestPromise<void>> = [];
    const buf = createPromiseBuffer({
      size: 3,
      concurrency: 2,
    });

    const addTask = (id: number) => {
      return buf.add(() => {
        const prom = createTestPromise<void>(id);
        promises.push(prom);
        return prom.promise;
      });
    };

    // adding 3 tasks works, 2 of them begin executing
    addTask(1);
    addTask(2);
    addTask(3);
    expect(promises).toHaveLength(2);
    // adding 4th task fails
    expect(() => addTask(4)).toThrow('Task buffer full');

    // finishing a task allows new tasks to be added again
    promises[0]?.resolve();

    await defer(() => {
      addTask(4);
    });
  });

  it('rejects and frees the slot when a producer throws synchronously', async () => {
    const buf = createPromiseBuffer<string>({ size: 1, concurrency: 1 });
    const failure = new Error('producer failed');

    await expect(
      buf.add(() => {
        throw failure;
      })
    ).rejects.toBe(failure);

    // the failed task no longer counts against size or concurrency
    await expect(buf.add(() => Promise.resolve('next'))).resolves.toEqual('next');
  });

  it('starts the next queued task after a producer throws synchronously', async () => {
    const buf = createPromiseBuffer<string>({ size: 3, concurrency: 1 });
    const blocker = createTestPromise<string>();
    const failure = new Error('producer failed');
    const queuedProducer = jest.fn(() => Promise.resolve('queued'));

    const first = buf.add(() => blocker.promise);
    const failing = buf.add(() => {
      throw failure;
    });
    const queued = buf.add(queuedProducer);

    blocker.resolve('first');

    await expect(first).resolves.toEqual('first');
    await expect(failing).rejects.toBe(failure);
    await expect(queued).resolves.toEqual('queued');
    expect(queuedProducer).toHaveBeenCalledTimes(1);
  });
});
