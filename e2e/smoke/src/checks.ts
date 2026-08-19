/**
 * A tiny runner for named checks, shared by the bundler playground and the content delivery network
 * page.
 *
 * It renders one row per check so a person can open the page and see what works, and it publishes the
 * same result on `window` with a machine-readable summary so a Playwright spec can assert that
 * nothing failed. One page, two audiences.
 */
export interface Check {
  name: string;
  run: () => void | Promise<void>;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  error?: string;
}

declare global {
  interface Window {
    __checkResults?: CheckResult[];
    __checksReady?: boolean;
  }
}

/** Fail with a readable message instead of a bare `false`. */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/** Resolve once `predicate` holds, or reject after `timeoutMs`. For signals that arrive out of band. */
export function waitFor(predicate: () => boolean, message: string, timeoutMs = 5_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`timed out after ${timeoutMs}ms waiting for ${message}`));
        return;
      }
      setTimeout(poll, 50);
    };

    poll();
  });
}

export async function runChecks(checks: Check[], container: HTMLElement): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const table = document.createElement('table');
  table.setAttribute('data-cy', 'results');
  table.innerHTML = '<thead><tr><th align="left">Check</th><th align="left">Result</th></tr></thead>';
  const body = document.createElement('tbody');
  table.appendChild(body);

  const summary = document.createElement('p');
  summary.setAttribute('data-cy', 'summary');
  container.append(summary, table);

  for (const check of checks) {
    let result: CheckResult;

    try {
      await check.run();
      result = { name: check.name, passed: true };
    } catch (error) {
      result = {
        name: check.name,
        passed: false,
        error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      };
    }

    results.push(result);

    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = check.name;
    const outcome = document.createElement('td');
    outcome.textContent = result.passed ? 'pass' : `FAIL — ${result.error?.split('\n')[0] ?? 'unknown'}`;
    outcome.style.color = result.passed ? 'green' : 'crimson';
    row.append(name, outcome);
    body.appendChild(row);
  }

  const failed = results.filter((entry) => !entry.passed);
  summary.textContent = `${results.length - failed.length}/${results.length} passed, ${failed.length} failed`;
  summary.setAttribute('data-failed', String(failed.length));
  summary.style.fontWeight = 'bold';
  summary.style.color = failed.length ? 'crimson' : 'green';

  window.__checkResults = results;
  window.__checksReady = true;

  return results;
}
