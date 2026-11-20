import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_PACKAGES, preCheckAlphaVersion, postCheckAlphaVersion } from './alpha-release.mjs';

test('PUBLIC_PACKAGES contains exactly the 6 publishable workspaces', () => {
  assert.equal(PUBLIC_PACKAGES.length, 6);
  assert.ok(PUBLIC_PACKAGES.includes('@grafana/faro-core'));
  assert.ok(PUBLIC_PACKAGES.includes('@grafana/faro-web-sdk'));
  assert.ok(PUBLIC_PACKAGES.includes('@grafana/faro-web-tracing'));
  assert.ok(PUBLIC_PACKAGES.includes('@grafana/faro-react'));
  assert.ok(PUBLIC_PACKAGES.includes('@grafana/faro-instrumentation-replay'));
  assert.ok(PUBLIC_PACKAGES.includes('@grafana/faro-transport-otlp-http'));
});

test('preCheckAlphaVersion allows publication when 0 packages exist on npm', async () => {
  const mockFetch = async () => ({ status: 404 });
  const result = await preCheckAlphaVersion({
    version: '2.15.0-alpha.0',
    fetchFn: mockFetch,
  });
  assert.equal(result.existing.length, 0);
  assert.equal(result.total, 6);
});

test('preCheckAlphaVersion allows partial publish reruns when only some packages exist', async () => {
  const mockFetch = async (url) => {
    // Simulate 2 packages already published in a previous attempt
    if (url.includes('faro-core') || url.includes('faro-web-sdk')) {
      return { status: 200 };
    }
    return { status: 404 };
  };

  const result = await preCheckAlphaVersion({
    version: '2.15.0-alpha.0',
    fetchFn: mockFetch,
  });
  assert.equal(result.existing.length, 2);
  assert.equal(result.total, 6);
});

test('preCheckAlphaVersion fails when all 6 packages already exist on npm', async () => {
  const mockFetch = async () => ({ status: 200 });
  await assert.rejects(
    async () => {
      await preCheckAlphaVersion({
        version: '2.15.0-alpha.0',
        fetchFn: mockFetch,
      });
    },
    {
      name: 'Error',
      message: /already exists on npm for all 6 packages/,
    }
  );
});

test('postCheckAlphaVersion passes when all packages exist on npm', async () => {
  const mockFetch = async () => ({ status: 200 });
  const result = await postCheckAlphaVersion({
    version: '2.15.0-alpha.0',
    fetchFn: mockFetch,
  });
  assert.equal(result.verified, 6);
});

test('postCheckAlphaVersion fails when any package is missing on npm', async () => {
  const mockFetch = async (url) => {
    if (url.includes('faro-transport-otlp-http')) {
      return { status: 404 };
    }
    return { status: 200 };
  };

  await assert.rejects(
    async () => {
      await postCheckAlphaVersion({
        version: '2.15.0-alpha.0',
        fetchFn: mockFetch,
        maxAttempts: 2,
        delayMs: 0,
      });
    },
    {
      name: 'Error',
      message: /Verification failed: the following packages were not found on npm/,
    }
  );
});

test('postCheckAlphaVersion retries and succeeds when package becomes visible on later attempt', async () => {
  let callCount = 0;
  const mockFetch = async (url) => {
    callCount++;
    // On the first pass (first 6 calls), transport returns 404; on the second pass it returns 200
    if (url.includes('faro-transport-otlp-http') && callCount <= 6) {
      return { status: 404 };
    }
    return { status: 200 };
  };

  const result = await postCheckAlphaVersion({
    version: '2.15.0-alpha.0',
    fetchFn: mockFetch,
    maxAttempts: 3,
    delayMs: 0,
  });

  assert.equal(result.verified, 6);
  assert.ok(callCount > 6);
});
