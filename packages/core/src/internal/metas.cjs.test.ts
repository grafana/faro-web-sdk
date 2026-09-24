import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { mockConfig, MockTransport } from '../testUtils';

// Use the package manifests, bypassing Jest's source aliases. The public and
// internal entry points must share one registry in the published build too.
const packagePath = join(__dirname, '../..');
const itWhenBuilt = existsSync(join(packagePath, 'dist/cjs/index.js')) ? it : it.skip;

itWhenBuilt('shares coordination state between the published CommonJS entry points', () => {
  const { initializeFaro } = require(packagePath) as typeof import('../index');
  const { getInternalMetas } = require(join(packagePath, 'internal')) as typeof import('./index');
  const transport = new MockTransport();
  const { api, metas } = initializeFaro(mockConfig({ transports: [transport] }));
  const internal = getInternalMetas(metas);
  const listener = jest.fn();
  const filter = () => false;
  internal.addCaptureFilter(filter);
  internal.addSessionUpdateListener(listener);

  api.setSession({ id: 'explicit-session' });
  api.pushEvent('same-event');
  expect(listener).toHaveBeenCalledWith({ type: 'replace', session: { id: 'explicit-session' }, overrides: undefined });
  expect(transport.items).toEqual([]);

  internal.removeCaptureFilter(filter);
  internal.removeSessionUpdateListener(listener);
  api.pushEvent('same-event');
  expect(transport.items).toHaveLength(1);
  expect(transport.items[0]?.meta.session?.id).toBe('explicit-session');
});
