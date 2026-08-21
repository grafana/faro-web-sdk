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

  it('accepts retained tasks when the buffer is full', async () => {
    const promises: Array<TestPromise<void>> = [];
    const buf = createPromiseBuffer({ size: 1, concurrency: 1 });

    buf.add(() => {
      const promise = createTestPromise<void>(1);
      promises.push(promise);
      return promise.promise;
    });
    const retainedTask = buf.add(
      () => {
        const promise = createTestPromise<void>(2);
        promises.push(promise);
        return promise.promise;
      },
      { allowOverflow: true }
    );

    expect(() => buf.add(() => Promise.resolve())).toThrow('Task buffer full');
    promises[0]?.resolve();

    await defer(() => {
      expect(promises).toHaveLength(2);
      promises[1]?.resolve();
    });
    await retainedTask;
  });
});
