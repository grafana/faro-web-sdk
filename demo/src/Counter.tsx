import { withGrafanaProfiler } from '@grafana/agent-integration-react';
import { useEffect } from 'react';

export interface CounterProps {
  value: number;
  value2: number;
  onSetCounter: () => void;
}

export function CounterComponent({ value, value2, onSetCounter }: CounterProps) {
  useEffect(() => {
    if (value === 3) {
      throw new Error('Oooopsie');
    }
  }, [value]);

  return (
    <>
      <p>{value}</p>
      <button onClick={onSetCounter}>Increment from within Counter</button>
      <p>{value2}</p>
    </>
  );
}

export const Counter = withGrafanaProfiler(CounterComponent);
