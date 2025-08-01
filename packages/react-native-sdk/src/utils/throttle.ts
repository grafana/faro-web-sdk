/**
 * Tail based throttle which caches the args of the last call and updates
 */
export function throttle<T extends (...args: any[]) => void>(callback: T, delay: number) {
  let pause = false;
  let lastPending: Parameters<T> | null;

  const timeoutBehavior = () => {
    if (lastPending == null) {
      pause = false;
      return;
    }

    callback(...lastPending);
    lastPending = null;
    setTimeout(timeoutBehavior, delay);
  };

  return (...args: Parameters<T>) => {
    if (pause) {
      lastPending = args;
      return;
    }

    callback(...args);
    pause = true;
    setTimeout(timeoutBehavior, delay);
  };
}
