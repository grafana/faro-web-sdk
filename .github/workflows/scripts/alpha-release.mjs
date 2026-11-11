import fs from 'node:fs';
import path from 'node:path';

export const PUBLIC_PACKAGES = [
  '@grafana/faro-core',
  '@grafana/faro-web-sdk',
  '@grafana/faro-web-tracing',
  '@grafana/faro-react',
  '@grafana/faro-instrumentation-replay',
  '@grafana/faro-transport-otlp-http',
];

/**
 * Checks whether the target version already exists on npm for the packages.
 * Fails if all packages already exist.
 * Allows execution if 0 to (N-1) packages exist (enabling partial publish reruns).
 *
 * @param {{ version: string, packages?: string[], fetchFn?: typeof fetch }} options
 */
export async function preCheckAlphaVersion({
  version,
  packages = PUBLIC_PACKAGES,
  fetchFn = globalThis.fetch,
}) {
  console.log(`[pre-check] Checking npm registry for existing publications of version ${version}...`);
  const existing = [];

  for (const pkg of packages) {
    const encodedPkg = encodeURIComponent(pkg);
    const encodedVer = encodeURIComponent(version);
    const url = `https://registry.npmjs.org/${encodedPkg}/${encodedVer}`;

    try {
      const res = await fetchFn(url);
      if (res.status === 200) {
        existing.push(pkg);
      }
    } catch (err) {
      console.warn(`[pre-check] Warning: failed to query registry for ${pkg}: ${err.message}`);
    }
  }

  if (existing.length === packages.length) {
    throw new Error(
      `Version ${version} already exists on npm for all ${packages.length} packages (${existing.join(
        ', '
      )}). To publish a new alpha, specify an incremented version (e.g. alpha.1).`
    );
  }

  if (existing.length > 0) {
    console.log(
      `[pre-check] Partial publish rerun detected: ${existing.length}/${packages.length} packages already published (${existing.join(
        ', '
      )}). Proceeding with remaining packages.`
    );
  } else {
    console.log(`[pre-check] Version ${version} is available. Proceeding with build and publish.`);
  }

  return { existing, total: packages.length };
}

/**
 * Updates package versions and cross-package dependency ranges in the CI runner.
 * This runs in memory / on the runner only and is never committed back to git.
 *
 * @param {{ version: string, repoRoot?: string }} options
 */
export function bumpAlphaVersion({ version, repoRoot = process.cwd() }) {
  console.log(`[bump] Updating package manifests to alpha version ${version}...`);

  const fileUpdates = [
    // 1. @grafana/faro-core
    {
      file: 'packages/core/package.json',
      update(json) {
        json.version = version;
      },
    },
    // 2. @grafana/faro-web-sdk
    {
      file: 'packages/web-sdk/package.json',
      update(json) {
        json.version = version;
        if (json.dependencies?.['@grafana/faro-core']) {
          json.dependencies['@grafana/faro-core'] = version;
        }
      },
    },
    // 3. @grafana/faro-web-tracing
    {
      file: 'packages/web-tracing/package.json',
      update(json) {
        json.version = version;
        if (json.dependencies?.['@grafana/faro-web-sdk']) {
          json.dependencies['@grafana/faro-web-sdk'] = version;
        }
      },
    },
    // 4. @grafana/faro-react
    {
      file: 'packages/react/package.json',
      update(json) {
        json.version = version;
        if (json.dependencies?.['@grafana/faro-web-sdk']) {
          json.dependencies['@grafana/faro-web-sdk'] = version;
        }
        if (json.dependencies?.['@grafana/faro-web-tracing']) {
          json.dependencies['@grafana/faro-web-tracing'] = version;
        }
      },
    },
    // 5. @grafana/faro-instrumentation-replay
    {
      file: 'experimental/instrumentation-replay/package.json',
      update(json) {
        json.version = version;
        if (json.dependencies?.['@grafana/faro-core']) {
          json.dependencies['@grafana/faro-core'] = version;
        }
      },
    },
    // 6. @grafana/faro-transport-otlp-http
    {
      file: 'experimental/transport-otlp-http/package.json',
      update(json) {
        json.version = version;
        if (json.dependencies?.['@grafana/faro-core']) {
          json.dependencies['@grafana/faro-core'] = version;
        }
      },
    },
    // 7. lerna.json
    {
      file: 'lerna.json',
      update(json) {
        json.version = version;
      },
    },
    // 8. e2e/smoke/package.json (private harness)
    {
      file: 'e2e/smoke/package.json',
      update(json) {
        json.version = version;
        for (const pkg of PUBLIC_PACKAGES) {
          if (json.devDependencies?.[pkg]) {
            json.devDependencies[pkg] = version;
          }
        }
      },
    },
  ];

  for (const { file, update } of fileUpdates) {
    const fullPath = path.resolve(repoRoot, file);
    let raw;
    try {
      raw = fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Target file not found: ${fullPath}`);
      }
      throw err;
    }
    const content = JSON.parse(raw);
    update(content);
    fs.writeFileSync(fullPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
    console.log(`[bump] Updated ${file}`);
  }

  console.log(`[bump] Successfully updated all workspaces to ${version}.`);
}

/**
 * Confirms that all packages now exist on npm with the target version.
 * Includes retries to handle npm registry CDN replication delay.
 *
 * @param {{ version: string, packages?: string[], fetchFn?: typeof fetch, maxAttempts?: number, delayMs?: number }} options
 */
export async function postCheckAlphaVersion({
  version,
  packages = PUBLIC_PACKAGES,
  fetchFn = globalThis.fetch,
  maxAttempts = 5,
  delayMs = 3000,
}) {
  console.log(`[post-check] Verifying all ${packages.length} packages exist on npm at version ${version}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const missing = [];

    for (const pkg of packages) {
      const encodedPkg = encodeURIComponent(pkg);
      const encodedVer = encodeURIComponent(version);
      const url = `https://registry.npmjs.org/${encodedPkg}/${encodedVer}`;

      try {
        const res = await fetchFn(url);
        if (res.status !== 200) {
          missing.push(pkg);
        }
      } catch (err) {
        missing.push(`${pkg} (${err.message})`);
      }
    }

    if (missing.length === 0) {
      console.log(`[post-check] Verification successful! All ${packages.length} packages exist on npm.`);
      return { verified: packages.length };
    }

    if (attempt < maxAttempts) {
      console.log(
        `[post-check] Attempt ${attempt}/${maxAttempts}: ${missing.length} package(s) not yet visible on npm (${missing.join(
          ', '
        )}). Waiting ${delayMs}ms before retrying...`
      );
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } else {
      throw new Error(
        `[post-check] Verification failed: the following packages were not found on npm at version ${version} after ${maxAttempts} attempts: ${missing.join(
          ', '
        )}`
      );
    }
  }
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('alpha-release.mjs')) {
  const command = process.argv[2];
  const version = process.env.VERSION;

  if (!version) {
    console.error('Missing VERSION environment variable.');
    process.exit(1);
  }

  if (command === 'pre-check') {
    preCheckAlphaVersion({ version }).catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
  } else if (command === 'bump') {
    try {
      bumpAlphaVersion({ version });
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  } else if (command === 'post-check') {
    postCheckAlphaVersion({ version }).catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
  } else {
    console.error(`Unknown command: "${command}". Available commands: pre-check, bump, post-check`);
    process.exit(1);
  }
}
