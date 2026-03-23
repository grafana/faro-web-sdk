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
    for (const subscriber of this.subscribers) {
      subscriber(value);
    }
  }

  first(): Observable<T> {
    const result = new Observable<T>();
    const sub = this.subscribe((data: T) => {
      result.notify(data);
      sub.unsubscribe();
    });
    return this._pipe(result, sub);
  }

  takeWhile(predicate: (value: T) => boolean): Observable<T> {
    const result = new Observable<T>();
    const sub = this.subscribe((value: T) => {
      if (predicate(value)) {
        result.notify(value);
      } else {
        sub.unsubscribe();
      }
    });
    return this._pipe(result, sub);
  }

  filter(predicate: (value: T) => boolean): Observable<T> {
    const result = new Observable<T>();
    const sub = this.subscribe((value: T) => {
      if (predicate(value)) {
        result.notify(value);
      }
    });
    return this._pipe(result, sub);
  }

  merge(...observables: Array<Observable<T>>): Observable<T> {
    const merged = new Observable<T>();
    const subs = observables.map((o) => o.subscribe((v: T) => merged.notify(v)));

    merged.unsubscribe = () => {
      for (const s of subs) s.unsubscribe();
      merged.subscribers = [];
    };

    return merged;
  }

  /** @internal — wires up unsubscribe so downstream cleanup also removes the upstream subscription */
  private _pipe(result: Observable<T>, upstreamSub: Subscription): Observable<T> {
    const origUnsub = result.unsubscribe.bind(result);
    result.unsubscribe = (subscriber: Subscriber<T>) => {
      origUnsub(subscriber);
      upstreamSub.unsubscribe();
    };
    return result;
  }
}
