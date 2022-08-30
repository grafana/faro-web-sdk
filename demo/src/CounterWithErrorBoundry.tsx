import { withErrorBoundary } from '@grafana/agent-integration-react';

import { Counter } from './Counter';

export const CounterWithErrorBoundry = withErrorBoundary(Counter, {});
