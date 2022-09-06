import { useEffect, useRef } from 'react';
import type { DependencyList } from 'react';

export function useIsomorphicEffect(callback: () => void, dependencies: DependencyList): void {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;

      return callback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRun, ...dependencies]);
}
