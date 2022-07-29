export interface PromiseBufferOptions {
  size: number;
  concurrency: number;
}

type PromiseProducer<T> = () => PromiseLike<T>;

export interface PromiseBuffer<T> {
  add(promiseProducer: PromiseProducer<T>): PromiseLike<T>;
}

interface BufferItem<T> {
  producer: PromiseProducer<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export function createPromiseBuffer<T>(options: PromiseBufferOptions): PromiseBuffer<T> {
  const { size, concurrency } = options;

  const buffer: Array<BufferItem<T>> = [];
  let inProgress = 0;

  const work = () => {
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

  const add: PromiseBuffer<T>['add'] = (promiseProducer) => {
    if (buffer.length + inProgress >= size) {
      return Promise.reject(new Error('Promise buffer full'));
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
