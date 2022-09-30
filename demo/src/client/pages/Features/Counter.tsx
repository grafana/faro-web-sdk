import Button from 'react-bootstrap/Button';

import { withGrafanaAgentErrorBoundary, withGrafanaAgentProfiler } from '@grafana/agent-integration-react';

export type CounterProps = {
  description: string;
  title: string;
  value: number;
  onChange: (value: number) => void;
};

export function CounterComponent({ description, title, value, onChange }: CounterProps) {
  return (
    <>
      <h4 className="mt-3">{title}</h4>
      <p>{description}</p>
      <p>
        Counter: {value} <Button onClick={() => onChange(value + 1)}>Increment</Button>
      </p>
    </>
  );
}

export const CounterWithErrorBoundary = withGrafanaAgentErrorBoundary(CounterComponent, {
  fallback: <>The content was broken</>,
});

export const CounterWithProfiler = withGrafanaAgentProfiler(CounterComponent);
