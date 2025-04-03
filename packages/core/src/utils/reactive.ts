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
    return this.subscribers.at(0) ? this : new Observable<T>();
  }

  takeWhile(predicate: (value: T) => boolean): Observable<T> {
    const result = new Observable<T>();

    const subscriber = (value: T): void => {
      if (predicate(value)) {
        result.notify(value);
      } else {
        result.unsubscribe(subscriber);
      }
    };
    this.subscribe(subscriber);

    const originalUnsubscribe = result.unsubscribe.bind(result);
    result.unsubscribe = (subscriber: Subscriber<T>) => {
      originalUnsubscribe(subscriber);
      this.unsubscribe(subscriber);
    };

    return result;
  }

  filter(predicate: (value: T) => boolean): Observable<T> {
    const result = new Observable<T>();

    const subscriber = (value: T): void => {
      if (predicate(value)) {
        result.notify(value);
      }
    };
    this.subscribe(subscriber);

    const originalUnsubscribe = result.unsubscribe.bind(result);
    result.unsubscribe = (subscriber: Subscriber<T>) => {
      originalUnsubscribe(subscriber);
      this.unsubscribe(subscriber);
    };

    return result;
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

  private unsubscribeAll(): void {
    this.subscribers = [];
  }
}
