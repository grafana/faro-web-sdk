import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  PUBLIC_PACKAGES,
  preCheckAlphaVersion,
  bumpAlphaVersion,
  postCheckAlphaVersion,
} from './alpha-release.mjs';

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

test('bumpAlphaVersion updates package.json versions and internal dependencies', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faro-bump-test-'));

  try {
    // Setup directory structure
    fs.mkdirSync(path.join(tmpDir, 'packages/core'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'packages/web-sdk'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'packages/web-tracing'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'packages/react'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'experimental/instrumentation-replay'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'experimental/transport-otlp-http'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'e2e/smoke'), { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, 'packages/core/package.json'),
      JSON.stringify({ name: '@grafana/faro-core', version: '2.13.0' })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'packages/web-sdk/package.json'),
      JSON.stringify({
        name: '@grafana/faro-web-sdk',
        version: '2.13.0',
        dependencies: { '@grafana/faro-core': '2.13.0' },
      })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'packages/web-tracing/package.json'),
      JSON.stringify({
        name: '@grafana/faro-web-tracing',
        version: '2.13.0',
        dependencies: { '@grafana/faro-web-sdk': '2.13.0' },
      })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'packages/react/package.json'),
      JSON.stringify({
        name: '@grafana/faro-react',
        version: '2.13.0',
        dependencies: {
          '@grafana/faro-web-sdk': '2.13.0',
          '@grafana/faro-web-tracing': '2.13.0',
        },
      })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'experimental/instrumentation-replay/package.json'),
      JSON.stringify({
        name: '@grafana/faro-instrumentation-replay',
        version: '2.13.0',
        dependencies: { '@grafana/faro-core': '2.13.0' },
      })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'experimental/transport-otlp-http/package.json'),
      JSON.stringify({
        name: '@grafana/faro-transport-otlp-http',
        version: '2.13.0',
        dependencies: { '@grafana/faro-core': '2.13.0' },
      })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'lerna.json'),
      JSON.stringify({ version: '2.13.0' })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'e2e/smoke/package.json'),
      JSON.stringify({
        name: '@grafana/faro-smoke-harness',
        version: '2.13.0',
        private: true,
        devDependencies: {
          '@grafana/faro-core': '2.13.0',
          '@grafana/faro-web-sdk': '2.13.0',
        },
      })
    );

    const targetVersion = '2.15.0-alpha.0';
    bumpAlphaVersion({ version: targetVersion, repoRoot: tmpDir });

    // Verify
    const core = JSON.parse(fs.readFileSync(path.join(tmpDir, 'packages/core/package.json'), 'utf8'));
    assert.equal(core.version, targetVersion);

    const sdk = JSON.parse(fs.readFileSync(path.join(tmpDir, 'packages/web-sdk/package.json'), 'utf8'));
    assert.equal(sdk.version, targetVersion);
    assert.equal(sdk.dependencies['@grafana/faro-core'], targetVersion);

    const react = JSON.parse(fs.readFileSync(path.join(tmpDir, 'packages/react/package.json'), 'utf8'));
    assert.equal(react.version, targetVersion);
    assert.equal(react.dependencies['@grafana/faro-web-sdk'], targetVersion);
    assert.equal(react.dependencies['@grafana/faro-web-tracing'], targetVersion);

    const lerna = JSON.parse(fs.readFileSync(path.join(tmpDir, 'lerna.json'), 'utf8'));
    assert.equal(lerna.version, targetVersion);

    const smoke = JSON.parse(fs.readFileSync(path.join(tmpDir, 'e2e/smoke/package.json'), 'utf8'));
    assert.equal(smoke.version, targetVersion);
    assert.equal(smoke.devDependencies['@grafana/faro-core'], targetVersion);
    assert.equal(smoke.devDependencies['@grafana/faro-web-sdk'], targetVersion);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('bumpAlphaVersion throws descriptive error when a target manifest is missing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faro-bump-missing-'));
  try {
    assert.throws(
      () => bumpAlphaVersion({ version: '2.15.0-alpha.0', repoRoot: tmpDir }),
      {
        name: 'Error',
        message: /Target file not found:/,
      }
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
