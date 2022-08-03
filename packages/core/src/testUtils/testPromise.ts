// exposes resolve, reject methods and
// adds id
export interface TestPromise<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: any) => void;

  id?: number;
}

export function createTestPromise<T>(id?: number) {
  const obj: TestPromise<T> = {
    id,
  } as TestPromise<T>;
  obj.promise = new Promise<T>((resolve, reject) => {
    obj.resolve = resolve;
    obj.reject = reject;
  });
  return obj;
}
