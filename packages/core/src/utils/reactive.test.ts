import { isString, Observable } from '..';

describe('Reactive', () => {
  describe('Observable', () => {
    it('Creates an observable, subscribe to it, and emit values', () => {
      const observable = new Observable<number>();
      const callback = jest.fn();

      observable.subscribe(callback);
      observable.notify(1);
      observable.notify(2);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 1);
      expect(callback).toHaveBeenNthCalledWith(2, 2);
    });

    it('Unsubscribes from an observable', () => {
      const observable = new Observable<number>();
      const callback = jest.fn();

      const subscription = observable.subscribe(callback);
      observable.notify(1);

      subscription.unsubscribe();
      observable.notify(2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1);
    });

    it('takes emitted values until the predicate returns false', () => {
      const observable = new Observable<number>();
      const callback = jest.fn();

      observable.takeWhile((value) => value <= 2).subscribe(callback);
      observable.notify(1);
      observable.notify(2);
      observable.notify(3);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 1);
      expect(callback).toHaveBeenNthCalledWith(2, 2);
    });

    it('subscribes to the first emitted value and unsubscribes after', () => {
      const observable = new Observable<number>();
      const callback = jest.fn();

      observable.first().subscribe(callback);
      observable.notify(1);
      observable.notify(2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1);
    });

    it('unsubscribes a callback from the list of subscribers', () => {
      const observable = new Observable<number>();
      const callback = jest.fn();

      const sub = observable.subscribe(callback);
      observable.notify(1);
      sub.unsubscribe();
      observable.notify(2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1);
    });
  });

  describe('Merge', () => {
    it('Merges multiple observables into a single observable using the merge() function', () => {
      const observable1 = new Observable<number | string>();
      const observable2 = new Observable<number | string>();
      const callback = jest.fn();

      const mergeObserverSub = new Observable<number | string>().merge(observable1, observable2).subscribe(callback);

      observable1.notify(1);
      observable2.notify('A');
      observable1.notify(2);
      observable2.notify('B');

      expect(callback).toHaveBeenCalledTimes(4);
      expect(callback).toHaveBeenNthCalledWith(1, 1);
      expect(callback).toHaveBeenNthCalledWith(2, 'A');
      expect(callback).toHaveBeenNthCalledWith(3, 2);
      expect(callback).toHaveBeenNthCalledWith(4, 'B');

      mergeObserverSub.unsubscribe();
      observable1.notify(3);
      observable2.notify('C');
      expect(callback).toHaveBeenCalledTimes(4);
      expect(callback).not.toHaveBeenNthCalledWith(5, 3);
      expect(callback).not.toHaveBeenNthCalledWith(6, 'C');
    });

    it('Unsubscribes from all observables when merge.unsubscribeAll isCalled', () => {
      const observable1 = new Observable<number>();
      const observable2 = new Observable<number>();
      const callback = jest.fn();

      const mergeObserverSub = new Observable<number>().merge(observable1, observable2);
      mergeObserverSub.subscribe(callback);

      observable1.notify(1);
      observable2.notify(2);

      mergeObserverSub.unsubscribe(callback);
      observable1.notify(3);
      observable2.notify(4);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 1);
      expect(callback).toHaveBeenNthCalledWith(2, 2);
    });

    it('Unsubscribes from all chained observables when unsubscribe is called on the final operator in the chain', () => {
      const observable = new Observable<number>().takeWhile((value) => value < 3).filter((value) => !isString(value));
      const callback = jest.fn();

      let chainedSubscription = observable.subscribe(callback);

      observable.notify(1);
      observable.notify(2);
      chainedSubscription.unsubscribe();
      observable.notify(3);
      observable.notify(4);
      observable.notify(5);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(2);

      // If we would have a left over (pending) subscription, it would be called more times
      callback.mockClear();
      chainedSubscription = observable.subscribe(callback);
      observable.notify(1);
      observable.notify(2);
      chainedSubscription.unsubscribe();

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(2);
    });
  });
});
