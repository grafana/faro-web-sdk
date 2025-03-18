import { merge, Observable } from '..';

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

      observable.first(callback);
      observable.notify(1);
      observable.notify(2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(1);
    });

    it('unsubscribes a callback from the list of subscribers', () => {
      const observable = new Observable<number>();
      const callback = jest.fn();

      observable.subscribe(callback);
      observable.notify(1);
      observable.unsubscribe(callback);
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

      merge(observable1, observable2).subscribe(callback);

      observable1.notify(1);
      observable2.notify('A');
      observable1.notify(2);
      observable2.notify('B');

      expect(callback).toHaveBeenCalledTimes(4);
      expect(callback).toHaveBeenNthCalledWith(1, 1);
      expect(callback).toHaveBeenNthCalledWith(2, 'A');
      expect(callback).toHaveBeenNthCalledWith(3, 2);
      expect(callback).toHaveBeenNthCalledWith(4, 'B');
    });

    it('Unsubscribes from all observables when the merged observable is unsubscribed', () => {
      const observable1 = new Observable<number>();
      const observable2 = new Observable<number>();
      const callback = jest.fn();

      const subscription = merge(observable1, observable2).subscribe(callback);
      observable1.notify(1);
      observable2.notify(2);

      subscription.unsubscribe();
      observable1.notify(3);
      observable2.notify(4);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 1);
      expect(callback).toHaveBeenNthCalledWith(2, 2);
    });
  });
});
