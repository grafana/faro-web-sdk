import { useEffect, useState } from 'react';

import { CounterWithErrorBoundary, CounterWithProfiler } from './Counter';

export function ReactInstrumentation() {
  const [brokenCounter, setBrokenCounter] = useState(0);
  const [profiledCounter, setProfiledCounter] = useState(0);

  useEffect(() => {
    if (brokenCounter === 3) {
      throw new Error('Counter is 3');
    }
  }, [brokenCounter]);

  return (
    <>
      <h3>React Instrumentation</h3>

      <CounterWithErrorBoundary
        title="Error Boundary"
        description="The following content is going to fail once counter will get to 3."
        value={brokenCounter}
        onChange={setBrokenCounter}
      />

      <CounterWithProfiler
        description="The following content is profiled, meaning that mounting times, re-renders, unmounting times etc. are collected."
        title="Profiler"
        value={profiledCounter}
        onChange={setProfiledCounter}
      />
    </>
  );
}
