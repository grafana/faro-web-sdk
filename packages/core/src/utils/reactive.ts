export interface Subscription {
  unsubscribe: () => void;
}

export class Observable<T = any> {
  private subscribers: Array<(data: T) => void>;

  constructor() {
    this.subscribers = [];
  }

  /**
   * Subscribes a callback function to the observable.
   * @param callback - The function to call when the observable emits a value.
   * @returns A subscription object with an unsubscribe method to cancel the subscription.
   */
  subscribe(callback: (data: T) => void): Subscription {
    this.subscribers.push(callback);

    return {
      unsubscribe: () => this.unsubscribe(callback),
    };
  }

  /**
   * Notifies all subscribers with the given data.
   * @param data - The data to emit to all subscribers.
   */
  notify(data: T): void {
    this.subscribers.forEach((callback) => callback(data));
  }

  /**
   * Subscribes a callback function to the observable and automatically unsubscribes after the first emission.
   * @param callback - The function to call when the observable emits a value.
   * @returns A subscription object with an unsubscribe method to cancel the subscription.
   */
  first(callback: (data: T) => void): Subscription {
    const subscription = this.subscribe((data) => {
      callback(data);
      subscription.unsubscribe();
    });

    return subscription;
  }

  /**
   * Emits values from the source observable until the provided predicate function returns false.
   * @param predicate - A function that evaluates each value emitted by the source observable.
   * @returns A new observable that emits values from the source observable while the predicate returns true.
   */
  takeWhile(predicate: (value: T) => boolean): Observable<T> {
    const result = new Observable<T>();
    const subscription = this.subscribe((value: T) => {
      if (predicate(value)) {
        result.notify(value);
      } else {
        subscription.unsubscribe();
      }
    });

    return result;
  }

  /**
   * Unsubscribes a callback function from the list of subscribers.
   * This function should never be used directly.
   * Use the unsubscribe function returned by subscribing to the observable.
   *
   * @param callback - The callback function to be removed from the subscribers list.
   */
  unsubscribe(callback: (data: any) => void): void {
    this.subscribers = this.subscribers.filter((sub) => sub !== callback);
  }
}

/**
 * Merges multiple observables into a single observable.
 *
 * @template T - The type of the values emitted by the observables.
 * @param {...Observable[]} observables - The observables to merge.
 * @returns {Observable} A new observable that emits values from all input observables.
 *
 * @remarks
 * The returned observable's `unsubscribe` method, when called, will unsubscribe from the merge observable and all input observables.
 */
export function merge<T>(...observables: Array<Observable<T>>): Observable<T> {
  const mainObservable = new Observable<T>();
  const subscriptions: Subscription[] = [];

  observables.forEach((observable) => {
    const subscription = observable.subscribe((value: T) => {
      mainObservable.notify(value);
    });
    subscriptions.push(subscription);
  });

  const originalUnsubscribe = mainObservable.unsubscribe.bind(mainObservable);
  mainObservable.unsubscribe = (callback: (data: any) => void) => {
    originalUnsubscribe(callback);
    subscriptions.forEach((subscription) => subscription.unsubscribe());
  };

  return mainObservable;
}
