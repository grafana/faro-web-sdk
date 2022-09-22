import { trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';

import { env } from '../utils';

export function getTracer(): Tracer {
  return trace.getTracer(env.server.packageName, env.package.version);
}
