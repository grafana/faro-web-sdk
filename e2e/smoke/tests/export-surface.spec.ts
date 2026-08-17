import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

import { type ExportShape, type ExportSurface, PUBLISHED_PACKAGES, readShape } from '../src/packages';

/**
 * Freezes the public export surface of all six packages on the three paths a consumer can take.
 *
 * The six packages export 288 runtime symbols between them. A rename or a dropped export breaks a
 * customer at import time, and no amount of clicking through a page would reliably catch it, so this
 * is checked mechanically instead.
 *
 * When the surface legitimately changes, regenerate the snapshot with `yarn snapshot:exports` and
 * commit the result. The diff is the review artifact: a reviewer sees exactly which symbols moved.
 */
const REPO_ROOT = resolve(process.cwd(), '../..');
const SNAPSHOT_PATH = join(process.cwd(), 'export-surface.json');
const UPDATING = Boolean(process.env['UPDATE_EXPORT_SURFACE']);

const requireFromRoot = createRequire(join(REPO_ROOT, 'noop.cjs'));

function collectCommonJs(): Record<string, ExportShape> {
  const surface: Record<string, ExportShape> = {};

  for (const pkg of PUBLISHED_PACKAGES) {
    const entry = join(REPO_ROOT, pkg.dir, 'dist/cjs/index.js');
    expect(existsSync(entry), `${entry} is missing. Run "yarn build" from the repository root.`).toBe(true);
    surface[pkg.name] = readShape(requireFromRoot(entry) as object);
  }

  return surface;
}

/** Compare one package on one path, and describe any difference in terms a reader can act on. */
function compare(path: string, name: string, expected: ExportShape, actual: ExportShape | null): string[] {
  if (actual === null) {
    return [`${name} (${path}): could not be loaded at all`];
  }

  const problems: string[] = [];
  const removed = Object.keys(expected).filter((key) => !(key in actual));
  const added = Object.keys(actual).filter((key) => !(key in expected));
  const retyped = Object.keys(expected).filter((key) => key in actual && expected[key] !== actual[key]);

  if (removed.length) {
    problems.push(`${name} (${path}): no longer exports ${removed.join(', ')}`);
  }
  if (retyped.length) {
    problems.push(
      `${name} (${path}): changed type for ${retyped
        .map((key) => `${key} (${expected[key]} to ${actual[key]})`)
        .join(', ')}`
    );
  }
  if (added.length) {
    problems.push(
      `${name} (${path}): exports ${added.join(', ')} which the snapshot does not list. ` +
        `If that is intended, run "yarn snapshot:exports" and commit the change.`
    );
  }

  return problems;
}

test.describe('Export surface', () => {
  test('matches the committed snapshot on all three consumption paths', async ({ page }) => {
    // CommonJS is read in Node, because that is how a `require` consumer sees it. The other two paths
    // need a browser: ES modules so that Vite resolves them the way a customer's bundler does, and the
    // bundles because they only exist as globals a script tag defines.
    const cjs = collectCommonJs();

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error).split('\n')[0] ?? ''));

    await page.goto('/exports.html');
    await page
      .waitForFunction(() => window.__surfaceReady === true, undefined, { timeout: 20_000 })
      .catch(() => {
        throw new Error(
          `The export page never finished. This usually means a package could not be loaded at all. ` +
            `Page errors: ${pageErrors.join(' | ') || 'none reported'}`
        );
      });

    const esm = await page.evaluate(() => window.__esmSurface ?? {});
    const esmErrors = await page.evaluate(() => window.__esmErrors ?? {});
    const iife = await page.evaluate(() => window.__iifeSurface ?? {});
    const iifeErrors = await page.evaluate(() => window.__iifeErrors ?? {});

    const collected: ExportSurface = {};
    for (const pkg of PUBLISHED_PACKAGES) {
      collected[pkg.name] = {
        cjs: cjs[pkg.name] ?? {},
        esm: esm[pkg.name] ?? {},
        iife: iife[pkg.name] ?? {},
      };
    }

    if (UPDATING) {
      writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(collected, null, 2)}\n`);
      const total = Object.values(collected).reduce((sum, paths) => sum + Object.keys(paths.cjs).length, 0);
      test.info().annotations.push({ type: 'snapshot', description: `wrote ${total} CommonJS exports` });
      return;
    }

    expect(existsSync(SNAPSHOT_PATH), `${SNAPSHOT_PATH} is missing. Generate it with "yarn snapshot:exports".`).toBe(
      true
    );

    const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as ExportSurface;
    const problems: string[] = [];

    for (const pkg of PUBLISHED_PACKAGES) {
      const expectedPaths = snapshot[pkg.name];

      if (!expectedPaths) {
        problems.push(`${pkg.name}: the snapshot has no entry. Run "yarn snapshot:exports".`);
        continue;
      }

      problems.push(...compare('CommonJS', pkg.name, expectedPaths.cjs, collected[pkg.name]?.cjs ?? null));
      problems.push(...compare('ES modules', pkg.name, expectedPaths.esm, collected[pkg.name]?.esm ?? null));
      problems.push(...compare('bundle', pkg.name, expectedPaths.iife, iife[pkg.name] ?? null));
    }

    for (const [name, message] of Object.entries(esmErrors)) {
      problems.push(`${name} (ES modules): ${message}`);
    }
    for (const [name, message] of Object.entries(iifeErrors)) {
      problems.push(`${name} (bundle): ${message}`);
    }

    expect(problems, `\n${problems.join('\n')}\n`).toHaveLength(0);
  });

  test('every package exports the same names on all three paths', async ({ page }) => {
    // A consumer should get the same API whether they require it, import it, or load the bundle.
    // Divergence here means one of the three outputs was built from a different entry.
    const cjs = collectCommonJs();

    await page.goto('/exports.html');
    await page.waitForFunction(() => window.__surfaceReady === true, undefined, { timeout: 20_000 });
    const esm = await page.evaluate(() => window.__esmSurface ?? {});
    const iife = await page.evaluate(() => window.__iifeSurface ?? {});

    const problems: string[] = [];

    for (const pkg of PUBLISHED_PACKAGES) {
      const fromCjs = Object.keys(cjs[pkg.name] ?? {}).sort();
      const fromEsm = Object.keys(esm[pkg.name] ?? {}).sort();
      const fromIife = Object.keys(iife[pkg.name] ?? {}).sort();

      if (fromCjs.join() !== fromEsm.join()) {
        const only = (a: string[], b: string[]) => a.filter((k) => !b.includes(k));
        problems.push(
          `${pkg.name}: CommonJS and ES modules disagree. ` +
            `CommonJS only: ${only(fromCjs, fromEsm).join(', ') || 'none'}. ` +
            `ES modules only: ${only(fromEsm, fromCjs).join(', ') || 'none'}.`
        );
      }

      // The bundles intentionally differ for packages that read a peer off a global, so only require
      // that the bundle is a subset of the module surface rather than an exact match.
      const missingFromBundle = fromEsm.filter((key) => !fromIife.includes(key));
      if (fromIife.length > 0 && missingFromBundle.length > 0) {
        problems.push(`${pkg.name}: the bundle is missing ${missingFromBundle.join(', ')}`);
      }
    }

    expect(problems, `\n${problems.join('\n')}\n`).toHaveLength(0);
  });
});
