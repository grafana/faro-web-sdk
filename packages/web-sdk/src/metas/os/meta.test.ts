import type { Meta } from '@grafana/faro-core';

import { osMeta } from './meta';

// MetaItem<P> is P | (() => P); osMeta is the function form.
const runOsMeta = () => (osMeta as () => Pick<Meta, 'os'>)();

describe('osMeta', () => {
  const originalUA = navigator.userAgent;

  const setUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });
  };

  afterEach(() => {
    setUserAgent(originalUA);
  });

  it('populates os.name and os.version from the user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const { os } = runOsMeta();

    expect(os?.name).toBe('Windows');
    expect(os?.version).toBe('10');
  });

  it('parses a macOS user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
    );

    const { os } = runOsMeta();

    expect(os?.name).toBe('Mac OS');
    expect(os?.version).toBe('14.2.1');
  });

  it('does not set build_id or detail (redundant with name/version, keep payload small)', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    );

    const { os } = runOsMeta();

    expect(os?.build_id).toBeUndefined();
    expect(os?.detail).toBeUndefined();
  });

  it('returns an empty os object when the user agent is not recognised', () => {
    setUserAgent('something-nonsense');

    const { os } = runOsMeta();

    expect(os).toEqual({});
  });
});
