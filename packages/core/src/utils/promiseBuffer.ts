export interface PromiseBufferOptions {
  // total number of concurrent tasks
  concurrency: number;
  // total number of uncompleted tasks to accept
  size: number;
}

export type PromiseProducer<T> = () => PromiseLike<T>;

interface PromiseBufferAddOptions {
  // Previously accepted work can re-enter the queue without being dropped behind newer tasks.
  allowOverflow?: boolean;
}

export interface PromiseBuffer<T> {
  add(promiseProducer: PromiseProducer<T>, options?: PromiseBufferAddOptions): PromiseLike<T>;
}

export interface BufferItem<T> {
  producer: PromiseProducer<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export function createPromiseBuffer<T>(options: PromiseBufferOptions): PromiseBuffer<T> {
  const { size, concurrency } = options;

  const buffer: Array<BufferItem<T>> = []; // pending, not-yet-started tasks
  let inProgress = 0; // counter for tasks currently in progress

  const work = () => {
    // if there's space for a task and buffer is not empty,
    // take one task from buffer and run it
    if (inProgress < concurrency && buffer.length) {
      const { producer, resolve, reject } = buffer.shift()!;

      inProgress++;

      producer().then(
        (result) => {
          inProgress--;

          work();

          resolve(result);
        },
        (reason) => {
          inProgress--;

          work();

          reject(reason);
        }
      );
    }
  };

  const add: PromiseBuffer<T>['add'] = (promiseProducer, addOptions) => {
    if (!addOptions?.allowOverflow && buffer.length + inProgress >= size) {
      throw new Error('Task buffer full');
    }

    return new Promise<T>((resolve, reject) => {
      buffer.push({
        producer: promiseProducer,
        resolve,
        reject,
      });
      work();
    });
  };

  return {
    add,
  };
}
