export function debounce(callback: (...args: any[]) => void, delay: number, maxDelay?: number) {
  let debounceTimeout: number;
  let maxDelayTimeout: number;

  setTimeout(() => {}, maxDelay);

  return (...args: Parameters<typeof callback>) => {
    window.clearTimeout(debounceTimeout);
    debounceTimeout = window.setTimeout(() => {
      callback(...args);
    }, delay);

    if (maxDelay && !maxDelayTimeout) {
      maxDelayTimeout = window.setTimeout(() => {
        clearTimeout(debounceTimeout);
        maxDelayTimeout = 0;
        callback(...args);
      }, maxDelay);
    }
  };
}
