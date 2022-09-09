import { trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';

import { packageVersion, serverPackageName } from '../../common';

export function getTracer(): Tracer {
  return trace.getTracer(serverPackageName, packageVersion);
}
