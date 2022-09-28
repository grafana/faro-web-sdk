import Button from 'react-bootstrap/Button';

import { withGrafanaAgentErrorBoundary } from '@grafana/agent-integration-react';

export type CounterProps = {
  value: number;
  onChange: (value: number) => void;
};

export function CounterComponent({ value, onChange }: CounterProps) {
  return (
    <>
      <p>Counter: {value}</p>
      <Button onClick={() => onChange(value + 1)}>Increment</Button>
    </>
  );
}

export const Counter = withGrafanaAgentErrorBoundary(CounterComponent, {
  fallback: <>The content was broken</>,
});
