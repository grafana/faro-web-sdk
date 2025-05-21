export type Subscription = {
  unsubscribe: () => void;
};

type Subscriber<T> = (value: T) => void;

export class Observable<T = any> {
  private subscribers: Array<Subscriber<T>> = [];

  subscribe(subscriber: Subscriber<T>): Subscription {
    this.subscribers.push(subscriber);
    return {
      unsubscribe: () => this.unsubscribe(subscriber),
    };
  }

  unsubscribe(subscriber: Subscriber<T>): void {
    this.subscribers = this.subscribers.filter((sub) => sub !== subscriber);
  }

  notify(value: T): void {
    this.subscribers.forEach((subscriber) => subscriber(value));
  }

  first(): Observable<T> {
    const result = new Observable<T>();

    const internalSubscriber = (data: T): void => {
      result.notify(data);
      subscription.unsubscribe();
    };
    const subscription = this.subscribe(internalSubscriber);
    const resultUnsubscribeFn = result.unsubscribe.bind(result);
    return this.withUnsubscribeOverride(result, resultUnsubscribeFn, internalSubscriber);
  }

  takeWhile(predicate: (value: T) => boolean): Observable<T> {
    const result = new Observable<T>();
    const internalSubscriber = (value: T): void => {
      if (predicate(value)) {
        result.notify(value);
      } else {
        result.unsubscribe(internalSubscriber);
      }
    };
    this.subscribe(internalSubscriber);
    const resultUnsubscribeFn = result.unsubscribe.bind(result);
    return this.withUnsubscribeOverride(result, resultUnsubscribeFn, internalSubscriber);
  }

  filter(predicate: (value: T) => boolean): Observable<T> {
    const result = new Observable<T>();

    const internalSubscriber = (value: T): void => {
      if (predicate(value)) {
        result.notify(value);
      }
    };
    this.subscribe(internalSubscriber);

    const resultUnsubscribeFn = result.unsubscribe.bind(result);
    return this.withUnsubscribeOverride(result, resultUnsubscribeFn, internalSubscriber);
  }

  merge(...observables: Array<Observable<T>>): Observable<T> {
    const mergerObservable = new Observable<T>();
    const subscriptions: Subscription[] = [];

    observables.forEach((observable) => {
      const subscription = observable.subscribe((value: T) => {
        mergerObservable.notify(value);
      });

      subscriptions.push(subscription);
    });

    const originalUnsubscribeAll = mergerObservable.unsubscribeAll.bind(mergerObservable);

    mergerObservable.unsubscribe = () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      originalUnsubscribeAll();
    };

    return mergerObservable;
  }

  private withUnsubscribeOverride(
    observable: Observable<T>,
    resultUnsubscribeFn: (subscriber: Subscriber<T>) => void,
    internalSubscriber: Subscriber<T>
  ) {
    observable.unsubscribe = (subscriber: Subscriber<T>) => {
      resultUnsubscribeFn(subscriber);
      this.unsubscribe(internalSubscriber);
    };

    return observable;
  }

  private unsubscribeAll(): void {
    this.subscribers = [];
  }
}
